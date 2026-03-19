import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AttendanceSummarySection } from '../components/attendance/AttendanceSummarySection'
import { AttendanceTodayCard } from '../components/attendance/AttendanceTodayCard'
import { useToast } from '../components/toast/useToast'
import { ConfirmModal } from '../components/modal/ConfirmModal'
import {
  createAttendance,
  getTodayAttendance,
  listMyAttendance,
  type ListMyAttendanceResponse,
  type TodayAttendanceStatus,
} from '../lib/attendance-api'
import {
  firstDayOfMonthYMDLocal,
  todayYMDLocal,
} from '../lib/date-utils'
import { getAccessToken } from '../lib/auth-session'
import { toneFromStatus } from '../lib/toast-helpers'

const SUMMARY_LIMIT = 10

export function HomePage() {
  const { pushToast } = useToast()

  const [today, setToday] = useState<TodayAttendanceStatus | null>(null)
  const [summary, setSummary] = useState<ListMyAttendanceResponse | null>(null)

  const [loadingToday, setLoadingToday] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [confirmStatus, setConfirmStatus] = useState<'IN' | 'OUT' | 'REFRESH' | null>(null)

  const [startDate, setStartDate] = useState(firstDayOfMonthYMDLocal)
  const [endDate, setEndDate] = useState(todayYMDLocal)
  const [appliedStart, setAppliedStart] = useState(firstDayOfMonthYMDLocal)
  const [appliedEnd, setAppliedEnd] = useState(todayYMDLocal)
  const [page, setPage] = useState(1)

  const loadToday = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoadingToday(true)
    try {
      const t = await getTodayAttendance(token)
      setToday(t)
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      pushToast({
        tone: toneFromStatus(statusCode),
        message: err instanceof Error ? err.message : 'Failed to load today status',
      })
    } finally {
      setLoadingToday(false)
    }
  }, [pushToast])

  const loadSummary = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoadingSummary(true)
    try {
      const res = await listMyAttendance({
        accessToken: token,
        page,
        limit: SUMMARY_LIMIT,
        startDate: appliedStart,
        endDate: appliedEnd,
      })
      setSummary(res)
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      pushToast({
        tone: toneFromStatus(statusCode),
        message: err instanceof Error ? err.message : 'Failed to load summary',
      })
    } finally {
      setLoadingSummary(false)
    }
  }, [appliedEnd, appliedStart, page, pushToast])

  useEffect(() => {
    void loadToday()
  }, [loadToday])

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadToday()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [loadToday])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadToday(), loadSummary()])
  }, [loadSummary, loadToday])

  const executeClock = useCallback(
    async (status: 'IN' | 'OUT') => {
      const token = getAccessToken()
      if (!token) return
      setSubmitting(true)
      try {
        await createAttendance(token, status)
        pushToast({
          tone: 'success',
          message: status === 'IN' ? 'Clock-in recorded' : 'Clock-out recorded',
        })
        await refreshAll()
      } catch (err) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode?: number }).statusCode
            : undefined
        pushToast({
          tone: toneFromStatus(statusCode),
          message:
            err instanceof Error
              ? err.message
              : status === 'IN'
                ? 'Clock-in failed'
                : 'Clock-out failed',
        })
      } finally {
        setSubmitting(false)
      }
    },
    [pushToast, refreshAll],
  )

  const requestClock = useCallback((status: 'IN' | 'OUT') => {
    setConfirmStatus(status)
  }, [])

  const onClockIn = () => {
    if (submitting) return
    requestClock('IN')
  }

  const onClockOut = () => {
    if (submitting) return
    requestClock('OUT')
  }

  const requestRefreshToday = useCallback(() => {
    setConfirmStatus('REFRESH')
  }, [])

  const onApplyFilter = (e: FormEvent) => {
    e.preventDefault()
    setAppliedStart(startDate)
    setAppliedEnd(endDate)
    setPage(1)
  }

  const onPageChange = (next: number) => {
    setPage(next)
  }

  return (
    <section className="panel home-attendance-panel">
      <div className="home-attendance">
        <header className="home-attendance-head">
          <h1 className="page-title">Attendance</h1>
          <p className="page-lead">
            Record WFH check-in and check-out. Summary uses your company default range (month to
            date) unless you change the filters.
          </p>
        </header>

        <div className="home-attendance-grid">
          <AttendanceTodayCard
            today={today}
            loading={loadingToday}
            submitting={submitting}
            refreshing={loadingToday}
            onClockIn={onClockIn}
            onClockOut={onClockOut}
            onRefreshToday={requestRefreshToday}
          />
          <AttendanceSummarySection
            summary={summary}
            loading={loadingSummary}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onApplyFilter={onApplyFilter}
            onPageChange={onPageChange}
          />
        </div>
      </div>

      <ConfirmModal
        open={confirmStatus !== null}
        title={
          confirmStatus === 'IN'
            ? 'Confirm clock-in'
            : confirmStatus === 'OUT'
              ? 'Confirm clock-out'
              : 'Confirm refresh'
        }
        message={
          confirmStatus === 'IN'
            ? 'Confirm recording attendance IN for today?'
            : confirmStatus === 'OUT'
              ? 'Confirm recording attendance OUT for today?'
              : 'Refresh today attendance status now?'
        }
        confirmText={
          confirmStatus === 'IN' ? 'Clock in' : confirmStatus === 'OUT' ? 'Clock out' : 'Refresh'
        }
        cancelText="Cancel"
        onCancel={() => setConfirmStatus(null)}
        onConfirm={async () => {
          const status = confirmStatus
          setConfirmStatus(null)
          if (status === 'IN' || status === 'OUT') await executeClock(status)
          if (status === 'REFRESH') await loadToday()
        }}
      />
    </section>
  )
}
