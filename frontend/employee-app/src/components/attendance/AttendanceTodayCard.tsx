import type { TodayAttendanceStatus } from '../../lib/attendance-api'
import { formatDateTimeShort } from '../../lib/date-utils'

type Props = {
  today: TodayAttendanceStatus | null
  loading: boolean
  submitting: boolean
  refreshing: boolean
  onClockIn: () => void
  onClockOut: () => void
  onRefreshToday: () => void
}

/**
 * BE rules: first action IN; then OUT; after OUT the day is closed (no more punches).
 */
export function AttendanceTodayCard({
  today,
  loading,
  submitting,
  refreshing,
  onClockIn,
  onClockOut,
  onRefreshToday,
}: Props) {
  const lastStatus = today?.lastStatus ?? null
  const dayCompleted = lastStatus === 'OUT'
  // One IN then one OUT per day; after OUT the backend rejects further punches.
  const canIn = !dayCompleted && lastStatus === null
  const canOut = !dayCompleted && lastStatus === 'IN'

  const workHours = (() => {
    if (!today?.firstInTime) return 0
    const start = new Date(today.firstInTime)
    if (Number.isNaN(start.getTime())) return 0

    const end = today.lastOutTime ? new Date(today.lastOutTime) : new Date()
    if (Number.isNaN(end.getTime())) return 0

    const diffMs = Math.max(0, end.getTime() - start.getTime())
    return diffMs / (1000 * 60 * 60)
  })()

  const inButtonClass = canIn ? 'primary-button' : 'attendance-clock-btn--inactive'
  const outButtonClass = canOut ? 'primary-button' : 'attendance-clock-btn--inactive'

  return (
    <div className="attendance-card">
      <div className="attendance-card-title-row">
        <h2 className="attendance-card-title">Today (WFH)</h2>
        <button
          type="button"
          className="secondary-button attendance-refresh-btn"
          disabled={refreshing}
          onClick={onRefreshToday}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading && !today ? (
        <p className="attendance-muted">Loading status…</p>
      ) : today ? (
        <>
          <p className="attendance-date-label">Date: {today.date}</p>
          <dl className="attendance-dl">
            <div>
              <dt>Check-in</dt>
              <dd>{formatDateTimeShort(today.firstInTime)}</dd>
            </div>
            <div>
              <dt>Check-out</dt>
              <dd>{formatDateTimeShort(today.lastOutTime)}</dd>
            </div>
            <div>
              <dt>Last action</dt>
              <dd>{today.lastStatus ?? '—'}</dd>
            </div>
          </dl>

          {dayCompleted ? (
            <p className="attendance-done">You have completed attendance for today.</p>
          ) : null}

          <div className="attendance-work-hours">
            <span className="attendance-work-hours-label">Work hours</span>
            <span className="attendance-work-hours-value">
              {workHours.toFixed(2)} h
            </span>
          </div>

          <div className="attendance-actions">
            <button
              type="button"
              className={`attendance-clock-btn ${inButtonClass}`}
              disabled={submitting || !canIn}
              onClick={onClockIn}
            >
              Clock in (IN)
            </button>
            <button
              type="button"
              className={`attendance-clock-btn ${outButtonClass}`}
              disabled={submitting || !canOut}
              onClick={onClockOut}
            >
              Clock out (OUT)
            </button>
          </div>
        </>
      ) : (
        <p className="attendance-muted">No data</p>
      )}
    </div>
  )
}
