import type { ReactNode } from 'react'

export function ModalOverlay({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}

