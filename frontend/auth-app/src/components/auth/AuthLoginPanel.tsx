import type { FormEvent } from 'react'

type Props = {
  email: string
  password: string
  message: string | null
  isSubmitting: boolean
  onEmailChange: (next: string) => void
  onPasswordChange: (next: string) => void
  onSubmitLogin: (e: FormEvent) => void
}

export function AuthLoginPanel({
  email,
  password,
  message,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmitLogin,
}: Props) {
  return (
    <>
      <h1 className="panel-title">Sign in</h1>
      <p className="panel-subtitle">
        Use your company email and password to continue.
      </p>

      <form className="form" onSubmit={onSubmitLogin}>
        <label className="field">
          <span className="field-label">Email</span>
          <input
            type="email"
            name="email"
            placeholder="admin@dexa.local"
            className="field-input"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            className="field-input"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {message ? (
          <p className="status status-success">{message}</p>
        ) : null}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </>
  )
}

