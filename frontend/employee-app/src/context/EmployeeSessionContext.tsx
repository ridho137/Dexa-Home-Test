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
import {
  getMe,
  logoutRequest,
  refreshAccessToken,
  type EmployeeProfile,
} from '../lib/auth-api'
import { toneFromStatus } from '../lib/toast-helpers'

type ViewState = 'loading' | 'ready'

type EmployeeSessionValue = {
  view: ViewState
  profile: EmployeeProfile | null
  userRole: string | null
  refreshBusy: boolean
  adminAppUrl: string
  updateProfile: (p: EmployeeProfile) => void
  logout: () => Promise<void>
}

const EmployeeSessionContext = createContext<EmployeeSessionValue | null>(null)

export function EmployeeSessionProvider({ children }: { children: ReactNode }) {
  const { pushToast } = useToast()
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:7000'
  const adminAppUrl = import.meta.env.VITE_ADMIN_APP_URL ?? 'http://localhost:7020'

  const [view, setView] = useState<ViewState>('loading')
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const authNonceRef = useRef(0)

  const redirectToAuth = useCallback(() => {
    window.location.href = authAppUrl
  }, [authAppUrl])

  const loadProfile = useCallback(async (accessToken: string, nonce: number) => {
    const p = await getMe(accessToken)
    if (authNonceRef.current !== nonce) return
    setProfile(p)
    setView('ready')
    const payload = decodeJwtPayload(accessToken) as JwtPayload | null
    setUserRole(payload?.role ?? null)
  }, [])

  const bootstrapAuth = useCallback(
    async (nonce: number) => {
      if (authNonceRef.current !== nonce) return

      const accessToken = getAccessToken()

      if (accessToken && !isJwtExpired(accessToken)) {
        try {
          await loadProfile(accessToken, nonce)
        } catch (err) {
          const statusCode =
            err && typeof err === 'object' && 'statusCode' in err
              ? (err as { statusCode?: number }).statusCode
              : undefined
          pushToast({ tone: toneFromStatus(statusCode), message: 'Failed to load profile' })
          clearAccessToken()
          clearRefreshTokenCookie()
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
        const newAccess = await refreshAccessToken(refreshToken)
        if (authNonceRef.current !== nonce) return
        setAccessToken(newAccess)
        await loadProfile(newAccess, nonce)
      } catch (err) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined
        pushToast({
          tone: toneFromStatus(statusCode),
          message: 'Session expired, please login again',
        })
        clearAccessToken()
        clearRefreshTokenCookie()
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

  const updateProfile = useCallback((p: EmployeeProfile) => {
    setProfile(p)
  }, [])

  const logout = useCallback(async () => {
    const accessToken = getAccessToken()
    try {
      if (accessToken) {
        await logoutRequest(accessToken)
      }
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      pushToast({
        tone: toneFromStatus(statusCode),
        message: err instanceof Error ? err.message : 'Logout failed',
      })
    } finally {
      clearAccessToken()
      clearRefreshTokenCookie()
      redirectToAuth()
    }
  }, [pushToast, redirectToAuth])

  const value = useMemo<EmployeeSessionValue>(
    () => ({
      view,
      profile,
      userRole,
      refreshBusy,
      adminAppUrl,
      updateProfile,
      logout,
    }),
    [view, profile, userRole, refreshBusy, adminAppUrl, updateProfile, logout],
  )

  return (
    <EmployeeSessionContext.Provider value={value}>{children}</EmployeeSessionContext.Provider>
  )
}

export function useEmployeeSession(): EmployeeSessionValue {
  const ctx = useContext(EmployeeSessionContext)
  if (!ctx) {
    throw new Error('useEmployeeSession must be used within EmployeeSessionProvider')
  }
  return ctx
}
