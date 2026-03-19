/** Local calendar date as YYYY-MM-DD (matches attendance query DTO). */
export function toYMDLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function firstDayOfMonthYMDLocal(): string {
  const now = new Date()
  return toYMDLocal(new Date(now.getFullYear(), now.getMonth(), 1))
}

export function todayYMDLocal(): string {
  return toYMDLocal(new Date())
}

export function formatDateTimeShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
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

export function formatHours(h: number): string {
  if (!Number.isFinite(h)) return '—'
  return `${h.toFixed(2)} h`
}
