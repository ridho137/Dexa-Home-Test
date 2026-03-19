import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PersonPlaceholderIcon } from '../icons/PersonPlaceholderIcon'
import type { EmployeeProfile } from '../../lib/auth-api'
import { ConfirmModal } from '../modal/ConfirmModal'

type Props = {
  profile: EmployeeProfile
  isAdmin: boolean
  adminAppUrl: string
  onLogout: () => void
}

export function EmployeeHeader({ profile, isAdmin, adminAppUrl, onLogout }: Props) {
  const navigate = useNavigate()
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

  const goProfile = () => {
    setMenuOpen(false)
    void navigate('/profile')
  }

  const confirmLogout = useCallback(() => {
    setConfirmOpen(false)
    onLogout()
  }, [onLogout])

  return (
    <>
      <header className="app-header">
      <div className="brand">
        <span className="brand-mark">Dexa</span>
        <span className="brand-sub">Employee</span>
      </div>

      <div className="header-actions">
        {isAdmin ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSwitchConfirmOpen(true)}
          >
            Switch to Admin App
          </button>
        ) : null}

        <div className="header-avatar-wrap" ref={wrapRef}>
          <button
            type="button"
            className="avatar-trigger"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt=""
                className="avatar-img"
                width={40}
                height={40}
              />
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
                className="avatar-cta"
                role="menuitem"
                onClick={goProfile}
              >
                <span className="avatar-action-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                  >
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm18-11.5a1.003 1.003 0 0 0 0-1.42l-1.58-1.58a1.003 1.003 0 0 0-1.42 0l-1.13 1.13 3.75 3.75L21 5.75Z" />
                  </svg>
                </span>
                Edit profile
              </button>

              <div className="avatar-divider" role="separator" />

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
        message="Are you sure you want to sign out from the Employee app?"
        confirmText="Sign out"
        cancelText="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
      <ConfirmModal
        open={switchConfirmOpen}
        title="Confirm switch application"
        message="Open Admin App now?"
        confirmText="Open"
        cancelText="Cancel"
        onCancel={() => setSwitchConfirmOpen(false)}
        onConfirm={() => {
          setSwitchConfirmOpen(false)
          window.location.href = adminAppUrl
        }}
      />
    </>
  )
}
