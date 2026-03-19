import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmModal } from '../modal/ConfirmModal'
import { PersonPlaceholderIcon } from '../icons/PersonPlaceholderIcon'

type Profile = {
  photoUrl: string | null
}

type Props = {
  profile: Profile | null
  employeeAppUrl: string
  onLogout: () => void | Promise<void>
}

export function AdminHeader({ profile, employeeAppUrl, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const confirmLogout = useCallback(async () => {
    setConfirmOpen(false)
    await onLogout()
  }, [onLogout])

  const openEmployee = useCallback(() => {
    window.location.href = employeeAppUrl
  }, [employeeAppUrl])

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Dexa</span>
          <span className="brand-sub">Admin HRD</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSwitchConfirmOpen(true)}
          >
            Switch to Employee App
          </button>

          <div className="header-avatar-wrap" ref={wrapRef}>
            <button
              type="button"
              className="avatar-trigger"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="avatar-img" width={40} height={40} />
              ) : (
                <span className="avatar-placeholder">
                  <PersonPlaceholderIcon className="avatar-person-icon" />
                </span>
              )}
            </button>

            {menuOpen ? (
              <div className="avatar-dropdown" role="menu">
                <button
                  type="button"
                  className="avatar-logout"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirmOpen(true)
                  }}
                >
                  <span className="avatar-power-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M12 2a1 1 0 0 1 1 1v8a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1Zm-6.364 3.636a1 1 0 1 1 1.414 1.414L4.414 8.586A1 1 0 0 1 3 7.172l2.636-2.636Zm12.728 0 2.636 2.636a1 1 0 1 1-1.414 1.414l-2.636-2.636a1 1 0 0 1 1.414-1.414ZM12 19a7 7 0 1 1 0-14 1 1 0 0 1 0 2 5 5 0 1 0 0 10 1 1 0 0 1 0 2Z" />
                    </svg>
                  </span>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm sign out"
        message={<span>Are you sure you want to sign out from the Admin app?</span>}
        confirmText="Sign out"
        cancelText="Cancel"
        confirmTone="secondary"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
      <ConfirmModal
        open={switchConfirmOpen}
        title="Confirm switch application"
        message="Open Employee App now?"
        confirmText="Open"
        cancelText="Cancel"
        onCancel={() => setSwitchConfirmOpen(false)}
        onConfirm={async () => {
          setSwitchConfirmOpen(false)
          openEmployee()
        }}
      />
    </>
  )
}

