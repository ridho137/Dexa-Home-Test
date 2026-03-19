import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminSession } from '../context/AdminSessionContext'
import { getAccessToken } from '../lib/auth-session'
import { ApiError } from '../lib/api-common'
import { listAdminAttendance, type AdminAttendanceRow } from '../lib/admin-api'
import { formatDateShort, formatHours, formatTimeShort, firstDayOfMonthYMDLocal, todayYMDLocal } from '../lib/date-utils'
import { useToast } from '../components/toast/useToast'

type AttendanceFilters = {
  page: number
  limit: number
  startDate: string
  endDate: string
  employeeId: string
}

type AttendanceDraftFilters = Omit<AttendanceFilters, 'page' | 'limit'>

const REQUIRED_WORK_HOURS = 9
const OVERTIME_THRESHOLD_HOURS = 10

type WorkHourStatusTone = 'low' | 'normal' | 'overtime' | 'muted'

type WorkHourStatus = {
  label: string
  tone: WorkHourStatusTone
}

function getWorkHourStatus(item: AdminAttendanceRow): WorkHourStatus {
  if (!item.hasCheckedIn) return { label: 'No check-in', tone: 'muted' }
  if (item.hasCheckedIn && !item.hasCheckedOut) return { label: 'In progress', tone: 'muted' }
  if (item.totalWorkHours >= OVERTIME_THRESHOLD_HOURS) return { label: 'Overtime', tone: 'overtime' }
  if (item.totalWorkHours < REQUIRED_WORK_HOURS) return { label: 'Less hours', tone: 'low' }
  return { label: 'Normal', tone: 'normal' }
}

export function AttendanceHistoryPage() {
  const { userRole, refreshBusy } = useAdminSession()
  const accessToken = getAccessToken()
  const { pushToast } = useToast()

  const today = useMemo(() => todayYMDLocal(), [])
  const firstDay = useMemo(() => firstDayOfMonthYMDLocal(), [])

  const [filters, setFilters] = useState<AttendanceFilters>({
    page: 1,
    limit: 10,
    startDate: firstDay,
    endDate: today,
    employeeId: '',
  })

  const [draft, setDraft] = useState<AttendanceDraftFilters>({
    startDate: firstDay,
    endDate: today,
    employeeId: '',
  })

  const [rows, setRows] = useState<AdminAttendanceRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const toneFromError = useCallback((err: unknown): 'error500' | 'warning' => {
    const statusCode = err instanceof ApiError ? err.statusCode : undefined
    return statusCode != null && statusCode >= 500 ? 'error500' : 'warning'
  }, [])

  const load = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await listAdminAttendance({
        accessToken,
        page: filters.page,
        limit: filters.limit,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        employeeId: filters.employeeId || undefined,
      })
      setRows(res.data)
      setTotalPages(res.totalPages)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load attendance history'
      setErrorMessage(msg)
      pushToast({ tone: toneFromError(err), message: msg })
    } finally {
      setLoading(false)
    }
  }, [accessToken, filters.endDate, filters.employeeId, filters.limit, filters.page, filters.startDate, pushToast, toneFromError])

  useEffect(() => {
    void load()
  }, [load])

  const isBusy = loading || refreshBusy
  const onPageChange = useCallback((nextPage: number) => {
    setFilters((prev) => ({ ...prev, page: nextPage }))
  }, [])

  const onLimitChange = useCallback(
    (nextLimit: number) => {
      setFilters((prev) => ({ ...prev, limit: nextLimit, page: 1 }))
    },
    [setFilters],
  )

  // Text input: debounce to avoid firing an API request on every character.
  useEffect(() => {
    const nextEmployeeId = draft.employeeId.trim()
    const timeoutId = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.employeeId === nextEmployeeId) return prev
        return { ...prev, employeeId: nextEmployeeId, page: 1 }
      })
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [draft.employeeId, setFilters])

  const grouped = useMemo(() => {
    const out: { date: string; items: AdminAttendanceRow[] }[] = []
    let current: string | null = null
    for (const r of rows) {
      if (current !== r.date) {
        out.push({ date: r.date, items: [r] })
        current = r.date
      } else {
        out[out.length - 1]!.items.push(r)
      }
    }
    return out
  }, [rows])

  if (userRole !== 'ADMIN_HR') {
    return (
      <section className="panel">
        <h2>Access denied</h2>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="page-header">
        <h2>Attendance history</h2>
      </div>

      <div className="filters">
        <div className="filter-row">
          <label className="field">
            <span>Start date</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => {
                const next = e.target.value
                setDraft((p) => ({ ...p, startDate: next }))
                setFilters((prev) => ({ ...prev, startDate: next, page: 1 }))
              }}
              disabled={isBusy}
            />
          </label>
          <label className="field">
            <span>End date</span>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => {
                const next = e.target.value
                setDraft((p) => ({ ...p, endDate: next }))
                setFilters((prev) => ({ ...prev, endDate: next, page: 1 }))
              }}
              disabled={isBusy}
            />
          </label>
          <label className="field">
            <span>Employee ID (optional)</span>
            <input
              value={draft.employeeId}
              onChange={(e) => setDraft((p) => ({ ...p, employeeId: e.target.value }))}
              placeholder="uuid"
              disabled={isBusy}
            />
          </label>
        </div>
      </div>

      <div className="filters-divider" />

      <div className="attendance-legend" role="note" aria-label="Work-hour status guide">
        <span className="attendance-legend-text">
          Company rule: one work day is 9h (including break). Overtime starts at 10h.
        </span>
        <div className="attendance-legend-items">
          <span className="status-pill status-pill--low">
            <span className="status-dot" aria-hidden />
            Less than 9h
          </span>
          <span className="status-pill status-pill--normal">
            <span className="status-dot" aria-hidden />
            9h to &lt;10h (Normal)
          </span>
          <span className="status-pill status-pill--overtime">
            <span className="status-dot" aria-hidden />
            10h+ (Overtime)
          </span>
        </div>
      </div>

      {errorMessage ? <div className="error-text">{errorMessage}</div> : null}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Date</th>
              <th>Employee</th>
              <th>Check IN</th>
              <th>Check OUT</th>
              <th>Total hours</th>
              <th>Work-hour status</th>
              <th>Last status</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && !loading ? (
              <tr>
                <td colSpan={7}>No attendance found</td>
              </tr>
            ) : null}

            {grouped.map((g) =>
              g.items.map((item, idx) => {
                const status = getWorkHourStatus(item)
                return (
                  <tr key={`${g.date}-${item.employeeId}-${idx}`}>
                    {idx === 0 ? (
                      <td className="table-group-cell" rowSpan={g.items.length}>
                        {formatDateShort(g.date)}
                      </td>
                    ) : null}
                    <td>
                      <div style={{ fontWeight: 700 }}>{item.employeeName ?? item.employeeId}</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>{item.employeeId}</div>
                    </td>
                    <td>{item.hasCheckedIn ? formatTimeShort(item.firstInTime) : '—'}</td>
                    <td>{item.hasCheckedOut ? formatTimeShort(item.lastOutTime) : '—'}</td>
                    <td>{formatHours(item.totalWorkHours)}</td>
                    <td>
                      <span className={`status-pill status-pill--${status.tone}`}>
                        <span className="status-dot" aria-hidden />
                        {status.label}
                      </span>
                    </td>
                    <td>{item.lastStatus ?? '—'}</td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-bar">
          <div className="pagination-left">
            <label className="limit-control">
              <span>Limit</span>
              <select
                value={filters.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                disabled={isBusy}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="pagination-meta">Page {filters.page} / {totalPages}</div>

          <div className="pagination-right">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isBusy || filters.page <= 1}
              onClick={() => onPageChange(filters.page - 1)}
            >
              Prev
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={isBusy || filters.page >= totalPages}
              onClick={() => onPageChange(filters.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

