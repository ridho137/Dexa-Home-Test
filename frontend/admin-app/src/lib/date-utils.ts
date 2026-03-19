export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toYMDLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function firstDayOfMonthYMDLocal(now = new Date()): string {
  return toYMDLocal(new Date(now.getFullYear(), now.getMonth(), 1))
}

export function todayYMDLocal(now = new Date()): string {
  return toYMDLocal(now)
}

export function formatDateShort(ymd: string): string {
  // Input is YYYY-MM-DD; display as DD Mon YYYY
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  if (!y || !m || !d) return ymd
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTimeShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    hour12: false,
  })
}

export function formatTimeShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatHours(hours: number): string {
  if (!Number.isFinite(hours)) return '-'
  // Keep 2 decimals but trim trailing zeros for nicer UI.
  const s = hours.toFixed(2)
  return s.replace(/\\.00$/, '').replace(/(\\.[0-9])0$/, '$1')
}

