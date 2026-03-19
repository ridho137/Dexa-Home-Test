import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import { loginRequest, logoutRequest, refreshAccessToken } from './lib/auth-api'
import {
  clearAccessToken,
  clearRefreshTokenCookie,
  decodeJwtPayload,
  getAccessToken,
  getRefreshTokenCookie,
  isJwtExpired,
  setAccessToken,
  setRefreshTokenCookie,
} from './lib/auth-session'
import { useToast } from './components/toast/useToast'
import { AuthChooserPanel } from './components/auth/AuthChooserPanel'
import { AuthLoadingPanel } from './components/auth/AuthLoadingPanel'
import { AuthLoginPanel } from './components/auth/AuthLoginPanel'
import { ConfirmModal } from './components/modal/ConfirmModal'

type AuthView = 'loading' | 'login' | 'chooser'
type ChosenApp = 'employee' | 'admin' | null

function App() {
  const { pushToast } = useToast()
  const [view, setView] = useState<AuthView>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<ChosenApp>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const authNonceRef = useRef(0)
  const [confirmKind, setConfirmKind] = useState<'employee' | 'admin' | 'logout' | null>(null)

  const bootstrapAuth = useCallback(async (nonce: number) => {
    setMessage(null)

    const isFresh = () => authNonceRef.current === nonce

    if (!isFresh()) return

    const refreshToken = getRefreshTokenCookie()
    if (!refreshToken) {
      if (!isFresh()) return
      clearAccessToken()
      setView('login')
      return
    }

    const access = getAccessToken()
    if (access && !isJwtExpired(access)) {
      const payload = decodeJwtPayload(access)
      if (!isFresh()) return
      setUserRole(payload?.role ?? null)
      setView('chooser')
      return
    }

    // If refresh token is already expired, do not attempt refresh.
    if (refreshToken && isJwtExpired(refreshToken)) {
      if (!isFresh()) return
      clearAccessToken()
      clearRefreshTokenCookie()
      setView('login')
      return
    }

    try {
      const newAccessToken = await refreshAccessToken(refreshToken)
      if (!isFresh()) return
      setAccessToken(newAccessToken)
      const payload = decodeJwtPayload(newAccessToken)
      setUserRole(payload?.role ?? null)
      setView('chooser')
    } catch (err) {
      if (!isFresh()) return
      clearAccessToken()
      clearRefreshTokenCookie()
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      const tone =
        typeof statusCode === 'number' && statusCode >= 500 ? 'error500' : 'warning'
      const msg =
        err instanceof Error ? err.message : 'Session refresh failed'
      pushToast({ tone, message: msg })
      setView('login')
    }
  }, [pushToast])

  useEffect(() => {
    const nonce = ++authNonceRef.current
    void bootstrapAuth(nonce)
  }, [bootstrapAuth])

  const onSubmitLogin = async (e: FormEvent) => {
    e.preventDefault()
    // Invalidate any in-flight bootstrapAuth calls.
    authNonceRef.current += 1
    setIsSubmitting(true)
    setMessage(null)
    try {
      const result = await loginRequest({ email: email.trim(), password })
      setAccessToken(result.accessToken)
      setRefreshTokenCookie(result.refreshToken)
      const refreshPayload = decodeJwtPayload(result.refreshToken)
      if (refreshPayload?.exp) {
        // Helpful for debugging cookie expiration vs expected "90d".
        console.debug('Auth: refresh token exp', {
          expUtc: new Date(refreshPayload.exp * 1000).toISOString(),
        })
      }
      const payload = decodeJwtPayload(result.accessToken)
      setUserRole(payload?.role ?? null)
      setMessage('Login successful. Please choose an application.')
      pushToast({ tone: 'success', message: 'Login successful.' })
      setView('chooser')
      setPassword('')
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      const tone = typeof statusCode === 'number' && statusCode >= 500 ? 'error500' : 'warning'
      const msg =
        err instanceof Error ? err.message : 'Sign in failed'
      pushToast({ tone, message: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestOpenApp = (app: Exclude<ChosenApp, null>) => {
    setSelectedApp(app)
    setConfirmKind(app)
  }

  const performOpenApp = (app: Exclude<ChosenApp, null>) => {
    if (app === 'employee') {
      const url =
        import.meta.env.VITE_EMPLOYEE_APP_URL ?? 'http://localhost:7010'
      window.location.href = url
      return
    }
    const url = import.meta.env.VITE_ADMIN_APP_URL ?? 'http://localhost:7020'
    window.location.href = url
  }

  const performLogoutHybrid = useCallback(async () => {
    const accessToken = getAccessToken()

    try {
      if (accessToken) {
        await logoutRequest(accessToken)
      }
      return
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined

      // Logout uses access token; if session is invalidated server-side,
      // try refresh once, then retry logout.
      if (statusCode === 401) {
        const refreshToken = getRefreshTokenCookie()
        if (refreshToken && !isJwtExpired(refreshToken)) {
          const newAccessToken = await refreshAccessToken(refreshToken)
          setAccessToken(newAccessToken)
          await logoutRequest(newAccessToken)
          return
        }
      }

      const tone =
        typeof statusCode === 'number' && statusCode >= 500 ? 'error500' : 'warning'
      const msg = err instanceof Error ? err.message : 'Logout failed'
      pushToast({ tone, message: msg })
    } finally {
      clearAccessToken()
      clearRefreshTokenCookie()
      setSelectedApp(null)
      setUserRole(null)
      setMessage(null)
      setView('login')
    }
  }, [pushToast])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Dexa</span>
          <span className="brand-sub">WFH Attendance</span>
        </div>
      </header>

      <main className="app-main">
        <section className="panel auth-container">
          {view === 'loading' ? <AuthLoadingPanel /> : null}

          {view === 'login' ? (
            <AuthLoginPanel
              email={email}
              password={password}
              message={message}
              isSubmitting={isSubmitting}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmitLogin={onSubmitLogin}
            />
          ) : null}

          {view === 'chooser' ? (
            <AuthChooserPanel
              userRole={userRole}
              selectedApp={selectedApp}
              onOpenApp={requestOpenApp}
              onLogout={() => setConfirmKind('logout')}
            />
          ) : null}
        </section>

        <ConfirmModal
          open={confirmKind !== null}
          title={
            confirmKind === 'employee'
              ? 'Open Employee App'
              : confirmKind === 'admin'
                ? 'Open Admin App'
                : 'Confirm sign out'
          }
          message={
            confirmKind === 'logout'
              ? 'Are you sure you want to sign out?'
              : confirmKind === 'employee'
                ? 'Are you sure you want to open the Employee App?'
                : 'Are you sure you want to open the Admin App?'
          }
          confirmText={
            confirmKind === 'logout'
              ? 'Sign out'
              : confirmKind === 'employee'
                ? 'Open Employee'
                : 'Open Admin'
          }
          cancelText="Cancel"
          onCancel={() => {
            setConfirmKind(null)
            if (confirmKind === 'employee' || confirmKind === 'admin') {
              setSelectedApp(null)
            }
          }}
          onConfirm={async () => {
            const kind = confirmKind
            setConfirmKind(null)
            if (kind === 'employee' || kind === 'admin') {
              performOpenApp(kind)
              return
            }
            if (kind === 'logout') {
              await performLogoutHybrid()
            }
          }}
        />
      </main>

      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Dexa Home Test</span>
        <span className="app-footer-secondary">
          Ridho Mufti Asyari.
        </span>
      </footer>
    </div>
  )
}

export default App
