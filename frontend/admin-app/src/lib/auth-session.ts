export const ACCESS_TOKEN_KEY = 'dexa_access_token'
export const REFRESH_COOKIE_KEY = 'dexa_refresh_token'

export type JwtPayload = {
  sub?: string
  email?: string
  role?: 'EMPLOYEE' | 'ADMIN_HR' | string
  sid?: string
  exp?: number
  iat?: number
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function setRefreshTokenCookie(token: string, days = 90): void {
  const payload = decodeJwtPayload(token)
  const nowMs = Date.now()
  const diffMs = typeof payload?.exp === 'number' ? payload.exp * 1000 - nowMs : null
  const maxAgeSeconds =
    diffMs && diffMs > 0 ? Math.floor(diffMs / 1000) : days * 24 * 60 * 60
  document.cookie = `${REFRESH_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; Secure`
}

export function getRefreshTokenCookie(): string | null {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const found = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE_KEY}=`))
  if (!found) return null
  return decodeURIComponent(found.slice(`${REFRESH_COOKIE_KEY}=`.length))
}

export function clearRefreshTokenCookie(): void {
  document.cookie = `${REFRESH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const json = atob(padded)
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now()
}

