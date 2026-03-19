const GATEWAY_BASE_URL = import.meta.env.VITE_GATEWAY_BASE_URL ?? 'http://localhost:3000'
const AUTH_API_KEY = import.meta.env.VITE_AUTH_API_KEY ?? 'dev-auth-key'

export class ApiError extends Error {
  statusCode: number
  constructor(input: { statusCode: number; message: string }) {
    super(input.message)
    this.statusCode = input.statusCode
  }
}

export type LoginResult = {
  accessToken: string
  refreshToken: string
}

export async function loginRequest(input: {
  email: string
  password: string
}): Promise<LoginResult> {
  const response = await fetch(`${GATEWAY_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': AUTH_API_KEY,
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const err = await readApiError(response)
    throw err
  }

  return (await response.json()) as LoginResult
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${GATEWAY_BASE_URL}/auth/refresh`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  })

  if (!response.ok) {
    const err = await readApiError(response)
    throw err
  }

  const body = (await response.json()) as { accessToken: string }
  return body.accessToken
}

export async function logoutRequest(accessToken: string): Promise<void> {
  const response = await fetch(`${GATEWAY_BASE_URL}/auth/logout`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const err = await readApiError(response)
    throw err
  }
}

async function readApiError(response: Response): Promise<ApiError> {
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
