import type { FormEvent } from 'react'
import type { AttendanceDayRow, ListMyAttendanceResponse } from '../../lib/attendance-api'
import { formatHours, formatTimeShort } from '../../lib/date-utils'

type Props = {
  summary: ListMyAttendanceResponse | null
  loading: boolean
  startDate: string
  endDate: string
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onApplyFilter: (e: FormEvent) => void
  onPageChange: (page: number) => void
}

const REQUIRED_WORK_HOURS = 9
const OVERTIME_THRESHOLD_HOURS = 10

type WorkHourStatusTone = 'low' | 'normal' | 'overtime' | 'muted'

type WorkHourStatus = {
  label: string
  tone: WorkHourStatusTone
}

function getWorkHourStatus(row: AttendanceDayRow): WorkHourStatus {
  if (!row.hasCheckedIn) return { label: 'No check-in', tone: 'muted' }
  if (row.hasCheckedIn && !row.hasCheckedOut) return { label: 'In progress', tone: 'muted' }
  if (row.totalWorkHours >= OVERTIME_THRESHOLD_HOURS) return { label: 'Overtime', tone: 'overtime' }
  if (row.totalWorkHours < REQUIRED_WORK_HOURS) return { label: 'Less hours', tone: 'low' }
  return { label: 'Normal', tone: 'normal' }
}

export function AttendanceSummarySection({
  summary,
  loading,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyFilter,
  onPageChange,
}: Props) {
  return (
    <div className="attendance-card attendance-card--wide">
      <h2 className="attendance-card-title">Summary</h2>
      <p className="attendance-muted attendance-card-sub">
        Default range matches the API: start of this month through today. Adjust dates and
        apply.
      </p>

      <form className="attendance-filter" onSubmit={onApplyFilter}>
        <label className="field field--inline">
          <span>From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </label>
        <label className="field field--inline">
          <span>To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          Apply
        </button>
      </form>

      <div className="attendance-legend" role="note" aria-label="Work-hour status guide">
        <span className="attendance-muted attendance-legend-text">
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

      {loading && !summary ? (
        <p className="attendance-muted">Loading summary…</p>
      ) : summary && summary.data.length === 0 ? (
        <p className="attendance-muted">No records in this range.</p>
      ) : summary ? (
        <>
          <div className="table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.map((row: AttendanceDayRow) => {
                  const status = getWorkHourStatus(row)
                  return (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{formatTimeShort(row.firstInTime)}</td>
                      <td>{formatTimeShort(row.lastOutTime)}</td>
                      <td>{formatHours(row.totalWorkHours)}</td>
                      <td>
                        <span className={`status-pill status-pill--${status.tone}`}>
                          <span className="status-dot" aria-hidden />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="attendance-pagination">
            <span className="attendance-muted">
              Page {summary.page} / {summary.totalPages} · {summary.total} day(s)
            </span>
            <div className="attendance-pagination-btns">
              <button
                type="button"
                className="secondary-button"
                disabled={loading || summary.page <= 1}
                onClick={() => onPageChange(summary.page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={loading || summary.page >= summary.totalPages}
                onClick={() => onPageChange(summary.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
