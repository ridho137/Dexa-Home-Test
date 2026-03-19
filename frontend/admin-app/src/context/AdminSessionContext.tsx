/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useToast } from '../components/toast/useToast'
import {
  clearAccessToken,
  clearRefreshTokenCookie,
  decodeJwtPayload,
  getAccessToken,
  getRefreshTokenCookie,
  isJwtExpired,
  setAccessToken,
  type JwtPayload,
} from '../lib/auth-session'
import { logoutRequest } from '../lib/admin-api'

export type EmployeeProfile = {
  id: string
  name: string
  email: string
  position: string
  phoneNumber: string | null
  photoUrl: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

type ViewState = 'loading' | 'ready'

type AdminSessionValue = {
  view: ViewState
  userRole: string | null
  profile: EmployeeProfile | null
  refreshBusy: boolean
  authAppUrl: string
  logout: () => Promise<void>
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null)

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const { pushToast } = useToast()
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:7000'

  const [view, setView] = useState<ViewState>('loading')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const authNonceRef = useRef(0)

  const redirectToAuth = useCallback(() => {
    window.location.href = authAppUrl
  }, [authAppUrl])

  const loadProfile = useCallback(async (accessToken: string, nonce: number) => {
    const res = await fetch(
      `${import.meta.env.VITE_GATEWAY_BASE_URL ?? 'http://localhost:3000'}/employees/me`,
      {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      },
    )

    if (!res.ok) {
      const statusCode = res.status
      throw new Error(`Failed to load profile (${statusCode})`)
    }

    if (authNonceRef.current !== nonce) return

    const p = (await res.json()) as EmployeeProfile
    setProfile(p)

    const payload = decodeJwtPayload(accessToken) as JwtPayload | null
    setUserRole(payload?.role ?? null)
    setView('ready')
  }, [])

  const bootstrapAuth = useCallback(
    async (nonce: number) => {
      if (authNonceRef.current !== nonce) return

      const accessToken = getAccessToken()

      if (accessToken && !isJwtExpired(accessToken)) {
        try {
          await loadProfile(accessToken, nonce)
        } catch {
          clearAccessToken()
          clearRefreshTokenCookie()
          setProfile(null)
          pushToast({ tone: 'error500', message: 'Failed to load admin session' })
          redirectToAuth()
        }
        return
      }

      const refreshToken = getRefreshTokenCookie()
      if (!refreshToken) {
        clearAccessToken()
        redirectToAuth()
        return
      }

      if (isJwtExpired(refreshToken)) {
        clearAccessToken()
        clearRefreshTokenCookie()
        redirectToAuth()
        return
      }

      setRefreshBusy(true)
      try {
        const response = await fetch(
          `${import.meta.env.VITE_GATEWAY_BASE_URL ?? 'http://localhost:3000'}/auth/refresh`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${refreshToken}` },
          },
        )

        if (!response.ok) {
          throw new Error(`Refresh failed (${response.status})`)
        }

        const body = (await response.json()) as { accessToken: string }
        const newAccess = body.accessToken

        if (authNonceRef.current !== nonce) return

        setAccessToken(newAccess)
        await loadProfile(newAccess, nonce)
      } catch {
        pushToast({ tone: 'warning', message: 'Session expired, please login again' })
        clearAccessToken()
        clearRefreshTokenCookie()
        setProfile(null)
        redirectToAuth()
      } finally {
        if (authNonceRef.current === nonce) setRefreshBusy(false)
      }
    },
    [loadProfile, pushToast, redirectToAuth],
  )

  useEffect(() => {
    const nonce = ++authNonceRef.current
    void bootstrapAuth(nonce)
  }, [bootstrapAuth])

  const logout = useCallback(async () => {
    const accessToken = getAccessToken()
    try {
      if (accessToken) {
        await logoutRequest(accessToken)
      }
    } catch (err) {
      pushToast({ tone: 'warning', message: err instanceof Error ? err.message : 'Logout failed' })
    } finally {
      clearAccessToken()
      clearRefreshTokenCookie()
      redirectToAuth()
    }
  }, [pushToast, redirectToAuth])

  const value = useMemo<AdminSessionValue>(
    () => ({
      view,
      userRole,
      profile,
      refreshBusy,
      authAppUrl,
      logout,
    }),
    [view, userRole, profile, refreshBusy, authAppUrl, logout],
  )

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession must be used within AdminSessionProvider')
  return ctx
}

