import { useMemo, useState } from 'react'
import type { CreateEmployeeRequest } from '../../lib/admin-api'
import { ModalOverlay } from '../common/ModalOverlay'
import { ConfirmModal } from '../modal/ConfirmModal'

type Props = {
  open: boolean
  creating: boolean
  onCancel: () => void
  onCreate: (body: CreateEmployeeRequest) => void | Promise<void>
}

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function validate(input: {
  name: string
  email: string
  password: string
  position: string
  role: CreateEmployeeRequest['role']
  phoneNumber: string
}): string | null {
  const name = input.name.trim()
  const email = input.email.trim()
  const position = input.position.trim()
  const phone = input.phoneNumber.trim()
  const password = input.password

  if (!name) return 'Name is required.'
  if (name.length > 100) return 'Name is too long (max 100).'

  if (!email) return 'Email is required.'
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailOk) return 'Invalid email format.'
  if (email.length > 150) return 'Email is too long (max 150).'

  if (!position) return 'Position is required.'
  if (position.length > 100) return 'Position is too long (max 100).'

  if (!password) return 'Password is required.'
  if (!PASSWORD_POLICY_REGEX.test(password)) {
    return 'Password must be at least 8 chars and include upper, lower, number, and symbol.'
  }

  if (input.role !== 'EMPLOYEE' && input.role !== 'ADMIN_HR') return 'Invalid role.'

  if (phone && phone.length > 50) return 'Phone is too long (max 50).'

  return null
}

export function CreateEmployeeModal({ open, creating, onCancel, onCreate }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [position, setPosition] = useState('')
  const [role, setRole] = useState<CreateEmployeeRequest['role']>('EMPLOYEE')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingBody, setPendingBody] = useState<CreateEmployeeRequest | null>(null)

  const validationError = useMemo(() => {
    return validate({ name, email, password, position, role, phoneNumber })
  }, [email, name, password, phoneNumber, position, role])

  const canSubmit = !validationError && !creating

  if (!open) return null

  return (
    <ModalOverlay title="Add employee" onClose={onCancel}>
      <form
        className="modal-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          setPendingBody({
            name: name.trim(),
            email: email.trim(),
            password,
            position: position.trim(),
            role,
            phoneNumber: phoneNumber.trim() || undefined,
          })
          setConfirmOpen(true)
        }}
      >
        <label className="field">
          <span>
            Name <span className="required-asterisk">*</span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={creating} />
        </label>

        <label className="field">
          <span>
            Email <span className="required-asterisk">*</span>
          </span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={creating} />
        </label>

        <label className="field">
          <span>
            Password <span className="required-asterisk">*</span>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={creating}
          />
        </label>

        <label className="field">
          <span>
            Position <span className="required-asterisk">*</span>
          </span>
          <input value={position} onChange={(e) => setPosition(e.target.value)} disabled={creating} />
        </label>

        <label className="field">
          <span>
            Role <span className="required-asterisk">*</span>
          </span>
          <select value={role} onChange={(e) => setRole(e.target.value as CreateEmployeeRequest['role'])} disabled={creating}>
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="ADMIN_HR">ADMIN_HR</option>
          </select>
        </label>

        <label className="field">
          <span>Phone (optional)</span>
          <input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={creating}
          />
        </label>

        {validationError ? <div className="modal-inline-error">{validationError}</div> : null}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm create employee"
        message="Create this employee now?"
        confirmText="Create"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (!pendingBody) return
          setConfirmOpen(false)
          await onCreate(pendingBody)
        }}
      />
    </ModalOverlay>
  )
}

