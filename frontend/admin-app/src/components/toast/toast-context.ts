import { createContext, type ReactNode } from 'react'

export type ToastTone = 'error500' | 'warning' | 'success' | 'adminNotification'

export type ToastData = {
  id: string
  tone: ToastTone
  message: ReactNode
}

export type ToastOptions = {
  durationMs?: number
}

export type ToastContextValue = {
  pushToast: (input: { tone: ToastTone; message: ReactNode }, opts?: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

