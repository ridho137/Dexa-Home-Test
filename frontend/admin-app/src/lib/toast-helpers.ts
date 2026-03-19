import type { ToastTone } from '../components/toast/toast-context'

export function toneFromStatus(statusCode?: number): ToastTone {
  if (!statusCode) return 'warning'
  if (statusCode >= 500) return 'error500'
  return 'warning'
}

