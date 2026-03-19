import {
  GATEWAY_BASE_URL,
  bearerHeaders,
  readApiError,
  requestWithAutoRefreshOn401,
} from './api-common'

export { ApiError } from './api-common'

export type EmployeeProfile = {
  id: string
  name: string
  email: string
  position: string
  phoneNumber: string | null
  photoUrl: string | null
  isActive: boolean
}

type LoginRefreshResponse = { accessToken: string }

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch(`${GATEWAY_BASE_URL}/auth/refresh`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  })

  if (!response.ok) {
    throw await readApiError(response)
  }

  const body = (await response.json()) as LoginRefreshResponse
  return body.accessToken
}

export async function getMe(accessToken: string): Promise<EmployeeProfile> {
  return requestWithAutoRefreshOn401(
    accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/employees/me`, {
        method: 'GET',
        headers: { ...bearerHeaders(token) },
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as EmployeeProfile
    },
  )
}

export async function updateMyProfile(input: {
  accessToken: string
  phoneNumber?: string
  photoFile?: File | null
}): Promise<EmployeeProfile> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) => {
      const form = new FormData()

      if (input.phoneNumber !== undefined && input.phoneNumber.trim() !== '') {
        form.append('phoneNumber', input.phoneNumber)
      }

      if (input.photoFile) {
        form.append('photo', input.photoFile)
      }

      return fetch(`${GATEWAY_BASE_URL}/employees/me/profile`, {
        method: 'PATCH',
        headers: { ...bearerHeaders(token) },
        body: form,
      })
    },
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as EmployeeProfile
    },
  )
}

export async function changeMyPassword(input: {
  accessToken: string
  oldPassword: string
  newPassword: string
}): Promise<void> {
  await requestWithAutoRefreshOn401(
    input.accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/employees/me/password`, {
        method: 'PATCH',
        headers: {
          ...bearerHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldPassword: input.oldPassword,
          newPassword: input.newPassword,
        }),
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
    },
  )
}

export async function logoutRequest(accessToken: string): Promise<void> {
  await requestWithAutoRefreshOn401(
    accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/auth/logout`, {
        method: 'DELETE',
        headers: { ...bearerHeaders(token) },
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
    },
  )
}
