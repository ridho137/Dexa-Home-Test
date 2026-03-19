import { useMemo, useState } from 'react'
import type { AdminEmployee, UpdateEmployeeRequest } from '../../lib/admin-api'
import { ModalOverlay } from '../common/ModalOverlay'
import { ConfirmModal } from '../modal/ConfirmModal'

type Props = {
  open: boolean
  employee: AdminEmployee | null
  editing: boolean
  onCancel: () => void
  onUpdate: (id: string, body: UpdateEmployeeRequest) => void | Promise<void>
}

export function UpdateEmployeeModal({ open, employee, editing, onCancel, onUpdate }: Props) {
  const [name, setName] = useState(employee?.name ?? '')
  const [position, setPosition] = useState(employee?.position ?? '')
  const [phoneNumber, setPhoneNumber] = useState(employee?.phoneNumber ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingBody, setPendingBody] = useState<UpdateEmployeeRequest | null>(null)

  const validationError = useMemo(() => {
    if (!open) return null
    const n = name.trim()
    const p = position.trim()
    const ph = phoneNumber.trim()
    if (!n && !p && !ph) return 'Provide at least one field to update.'
    if (n && n.length > 100) return 'Name is too long (max 100).'
    if (p && p.length > 100) return 'Position is too long (max 100).'
    if (ph && ph.length > 50) return 'Phone is too long (max 50).'
    return null
  }, [name, open, phoneNumber, position])

  const canSubmit = !validationError && !editing && !!employee

  if (!open || !employee) return null

  return (
    <ModalOverlay title="Update employee" onClose={onCancel}>
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit || !employee) return
          setPendingBody({
            name: name.trim() || undefined,
            position: position.trim() || undefined,
            phoneNumber: phoneNumber.trim() || undefined,
          })
          setConfirmOpen(true)
        }}
      >
        <label className="field">
          <span>
            Name <span className="required-asterisk">*</span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={editing} />
        </label>

        <label className="field">
          <span>
            Position <span className="required-asterisk">*</span>
          </span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} disabled={editing} />
        </label>

        <label className="field">
          <span>
            Phone <span className="required-asterisk">*</span>
          </span>
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={editing} />
        </label>

        {validationError ? <div className="modal-inline-error">{validationError}</div> : null}

        {!validationError ? (
          <div className="modal-hint">At least one field is required.</div>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={editing}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {editing ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm update employee"
        message="Save employee profile changes?"
        confirmText="Save"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!pendingBody || !employee) return
          setConfirmOpen(false)
          await onUpdate(employee.id, pendingBody)
        }}
      />
    </ModalOverlay>
  )
}

