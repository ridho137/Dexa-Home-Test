import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext, type ToastData, type ToastTone, type ToastOptions } from './toast-context'

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timeoutsRef = useRef<Map<string, number>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const existing = timeoutsRef.current.get(id)
    if (existing) window.clearTimeout(existing)
    timeoutsRef.current.delete(id)
  }, [])

  const pushToast = useCallback(
    (input: { tone: ToastTone; message: ReactNode }, opts?: ToastOptions) => {
      const durationMs = opts?.durationMs ?? 4000
      const id = createId()
      const toast: ToastData = { id, tone: input.tone, message: input.message }

      setToasts((prev) => [...prev, toast])

      const timeoutId = window.setTimeout(() => removeToast(id), durationMs)
      timeoutsRef.current.set(id, timeoutId)
    },
    [removeToast],
  )

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${getToastClass(t.tone)}`}
            role="status"
          >
            {t.tone === 'adminNotification' ? (
              <span className="toast-admin-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5L3 18v1h18v-1l-2-2Z" />
                </svg>
              </span>
            ) : null}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function getToastClass(tone: ToastTone): string {
  switch (tone) {
    case 'error500':
      return 'toast-error'
    case 'warning':
      return 'toast-warn'
    case 'success':
      return 'toast-success'
    case 'adminNotification':
      return 'toast-admin'
    default:
      return 'toast-warn'
  }
}

