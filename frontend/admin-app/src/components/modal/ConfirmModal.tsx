import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  confirmTone?: 'primary' | 'secondary'
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmTone = 'primary',
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null

  const onConfirmClick = async () => {
    await onConfirm()
  }

  return (
    <div className="confirm-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-body">
          <h2 className="confirm-modal-title">{title}</h2>
          <div className="confirm-modal-message">{message}</div>
        </div>

        <div className="confirm-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmTone === 'secondary' ? 'btn btn-secondary' : 'btn btn-primary'}
            onClick={() => void onConfirmClick()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

