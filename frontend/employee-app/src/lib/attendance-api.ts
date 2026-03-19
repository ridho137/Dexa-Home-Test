import {
  GATEWAY_BASE_URL,
  bearerHeaders,
  readApiError,
  requestWithAutoRefreshOn401,
} from './api-common'

export type TodayAttendanceStatus = {
  date: string
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  firstInTime: string | null
  lastOutTime: string | null
  lastStatus: 'IN' | 'OUT' | null
}

export type AttendanceDayRow = {
  date: string
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  firstInTime: string | null
  lastOutTime: string | null
  lastStatus: 'IN' | 'OUT' | null
  totalWorkHours: number
}

export type ListMyAttendanceResponse = {
  data: AttendanceDayRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type AttendanceRecord = {
  id: string
  employeeId: string
  attendanceDate: string
  attendanceTime: string
  status: 'IN' | 'OUT'
  createdAt: string
}

export async function getTodayAttendance(
  accessToken: string,
): Promise<TodayAttendanceStatus> {
  return requestWithAutoRefreshOn401(
    accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/attendances/me/today`, {
        method: 'GET',
        headers: { ...bearerHeaders(token) },
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as TodayAttendanceStatus
    },
  )
}

export async function listMyAttendance(input: {
  accessToken: string
  page?: number
  limit?: number
  startDate?: string
  endDate?: string
}): Promise<ListMyAttendanceResponse> {
  return requestWithAutoRefreshOn401(
    input.accessToken,
    (token) => {
      const params = new URLSearchParams()
      if (input.page != null) params.set('page', String(input.page))
      if (input.limit != null) params.set('limit', String(input.limit))
      if (input.startDate) params.set('startDate', input.startDate)
      if (input.endDate) params.set('endDate', input.endDate)

      const qs = params.toString()
      const url = `${GATEWAY_BASE_URL}/attendances/me${qs ? `?${qs}` : ''}`

      return fetch(url, {
        method: 'GET',
        headers: { ...bearerHeaders(token) },
      })
    },
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as ListMyAttendanceResponse
    },
  )
}

export async function createAttendance(
  accessToken: string,
  status: 'IN' | 'OUT',
): Promise<AttendanceRecord> {
  return requestWithAutoRefreshOn401(
    accessToken,
    (token) =>
      fetch(`${GATEWAY_BASE_URL}/attendances`, {
        method: 'POST',
        headers: {
          ...bearerHeaders(token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }),
    async (response) => {
      if (!response.ok) throw await readApiError(response)
      return (await response.json()) as AttendanceRecord
    },
  )
}
