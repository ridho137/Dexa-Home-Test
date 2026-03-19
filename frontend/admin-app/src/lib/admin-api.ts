import {
  GATEWAY_BASE_URL,
  bearerHeaders,
  readApiError,
  requestWithAutoRefreshOn401,
} from './api-common'

export type AdminEmployee = {
  id: string
  name: string
  email: string
  position: string
  role: 'EMPLOYEE' | 'ADMIN_HR' | string
  phoneNumber: string | null
  photoUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ListEmployeesResponse = {
  data: AdminEmployee[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CreateEmployeeRequest = {
  name: string
  email: string
  password: string
  position: string
  role?: 'EMPLOYEE' | 'ADMIN_HR'
  phoneNumber?: string
}

export type UpdateEmployeeRequest = {
  name?: string
  position?: string
  phoneNumber?: string
}

export type AdminAttendanceRow = {
  date: string
  employeeId: string
  employeeName: string | null
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  firstInTime: string | null
  lastOutTime: string | null
  lastStatus: 'IN' | 'OUT' | null
  totalWorkHours: number
}

export type AdminAttendanceListResponse = {
  data: AdminAttendanceRow[]
  total: number
  page: number
  limit: number
  totalPages: number
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

export async function listEmployeesAdmin(input: {
  accessToken: string
  page?: number
  limit?: number
  role?: string
  search?: string
}): Promise<ListEmployeesResponse> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) => {
      const params = new URLSearchParams()
      if (input.page != null) params.set('page', String(input.page))
      if (input.limit != null) params.set('limit', String(input.limit))
      if (input.role) params.set('role', input.role)
      if (input.search) params.set('search', input.search)

      const qs = params.toString()
      const url = `${GATEWAY_BASE_URL}/employees/admin${qs ? `?${qs}` : ''}`
      return fetch(url, {
        method: 'GET',
        headers: { ...bearerHeaders(token) },
      })
    },
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as ListEmployeesResponse
    },
  )
}

export async function createEmployeeAdmin(input: {
  accessToken: string
  body: CreateEmployeeRequest
}): Promise<AdminEmployee> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/employees/admin`, {
        method: 'POST',
        headers: {
          ...bearerHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: input.body.name,
          email: input.body.email,
          password: input.body.password,
          position: input.body.position,
          role: input.body.role,
          phoneNumber: input.body.phoneNumber,
        }),
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as AdminEmployee
    },
  )
}

export async function updateEmployeeAdmin(input: {
  accessToken: string
  id: string
  body: UpdateEmployeeRequest
}): Promise<AdminEmployee> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/employees/admin/${encodeURIComponent(input.id)}`, {
        method: 'PATCH',
        headers: {
          ...bearerHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: input.body.name,
          position: input.body.position,
          phoneNumber: input.body.phoneNumber,
        }),
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as AdminEmployee
    },
  )
}

export async function listAdminAttendance(input: {
  accessToken: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
  employeeId?: string
}): Promise<AdminAttendanceListResponse> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) => {
      const params = new URLSearchParams()
      if (input.page != null) params.set('page', String(input.page))
      if (input.limit != null) params.set('limit', String(input.limit))
      if (input.startDate) params.set('startDate', input.startDate)
      if (input.endDate) params.set('endDate', input.endDate)
      if (input.employeeId) params.set('employeeId', input.employeeId)

      const qs = params.toString()
      const url = `${GATEWAY_BASE_URL}/attendances/admin${qs ? `?${qs}` : ''}`
      return fetch(url, {
        method: 'GET',
        headers: { ...bearerHeaders(token) },
      })
    },
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as AdminAttendanceListResponse
    },
  )
}

