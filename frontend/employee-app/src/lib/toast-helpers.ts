import type { ToastTone } from '../components/toast/toast-context'

export function toneFromStatus(statusCode?: number): ToastTone {
  if (typeof statusCode === 'number' && statusCode >= 500) return 'error500'
  return 'warning'
}
