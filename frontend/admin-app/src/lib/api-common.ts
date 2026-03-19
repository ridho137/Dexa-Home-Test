import {
  clearAccessToken,
  clearRefreshTokenCookie,
  getRefreshTokenCookie,
  isJwtExpired,
  setAccessToken,
} from './auth-session'

export const GATEWAY_BASE_URL =
  import.meta.env.VITE_GATEWAY_BASE_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  statusCode: number
  constructor(input: { statusCode: number; message: string }) {
    super(input.message)
    this.statusCode = input.statusCode
  }
}

export async function readApiError(response: Response): Promise<ApiError> {
  const message = await readErrorMessage(response)
  return new ApiError({ statusCode: response.status, message })
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[]
      error?: string
      statusCode?: number
    }

    if (Array.isArray(body.message)) return body.message.join(', ')
    if (typeof body.message === 'string' && body.message.trim()) return body.message
    if (typeof body.error === 'string' && body.error.trim()) return body.error
  } catch {
    // no-op
  }

  return `Request failed with status ${response.status}`
}

export function bearerHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` }
}

let refreshAccessTokenWithRefreshCookieInFlight: Promise<string> | null = null

async function refreshAccessTokenWithRefreshCookie(): Promise<string> {
  const refreshToken = getRefreshTokenCookie()
  if (!refreshToken) {
    throw new ApiError({ statusCode: 401, message: 'MISSING_REFRESH_TOKEN' })
  }

  const refreshPromise = (async () => {
    const response = await fetch(`${GATEWAY_BASE_URL}/auth/refresh`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })

    if (response.status === 401) {
      throw new ApiError({
        statusCode: 401,
        message: 'INVALID_REFRESH_TOKEN',
      })
    }

    if (!response.ok) {
      throw await readApiError(response)
    }

    const body = (await response.json()) as { accessToken: string }
    setAccessToken(body.accessToken)
    return body.accessToken
  })()

  // Deduplicate concurrent refresh calls across multiple requests.
  refreshAccessTokenWithRefreshCookieInFlight = refreshPromise
  try {
    return await refreshPromise
  } finally {
    refreshAccessTokenWithRefreshCookieInFlight = null
  }
}

function breakSessionAndRedirect(): void {
  clearAccessToken()
  clearRefreshTokenCookie()
  const authAppUrl = import.meta.env.VITE_AUTH_APP_URL ?? 'http://localhost:7000'
  window.location.href = authAppUrl
}

async function getRefreshedAccessTokenOrBreak(): Promise<string> {
  try {
    if (refreshAccessTokenWithRefreshCookieInFlight) {
      return await refreshAccessTokenWithRefreshCookieInFlight
    }
    return await refreshAccessTokenWithRefreshCookie()
  } catch (err) {
    // Refresh token invalid/expired (DB deactivated) -> break session.
    if (err instanceof ApiError && err.statusCode === 401) {
      breakSessionAndRedirect()
    }
    throw err
  }
}

export async function requestWithAutoRefreshOn401<T>(
  initialAccessToken: string,
  requestFn: (token: string) => Promise<Response>,
  parseFn: (response: Response) => Promise<T>,
): Promise<T> {
  if (!initialAccessToken) {
    throw new ApiError({ statusCode: 401, message: 'MISSING_ACCESS_TOKEN' })
  }

  let accessToken = initialAccessToken

  // Proactive: if JWT exp says expired, refresh before making the API call.
  if (isJwtExpired(accessToken)) {
    accessToken = await getRefreshedAccessTokenOrBreak()
  }

  let response = await requestFn(accessToken)
  if (response.status !== 401) {
    return await parseFn(response)
  }

  // Reactive: 401 from API indicates access token/session invalidated server-side.
  accessToken = await getRefreshedAccessTokenOrBreak()
  response = await requestFn(accessToken)
  return await parseFn(response)
}

