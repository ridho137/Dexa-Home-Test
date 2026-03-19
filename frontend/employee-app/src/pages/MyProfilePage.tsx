import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PersonPlaceholderIcon } from '../components/icons/PersonPlaceholderIcon'
import { useToast } from '../components/toast/useToast'
import { ConfirmModal } from '../components/modal/ConfirmModal'
import { useEmployeeSession } from '../context/EmployeeSessionContext'
import { changeMyPassword, updateMyProfile } from '../lib/auth-api'
import { getAccessToken } from '../lib/auth-session'
import { toneFromStatus } from '../lib/toast-helpers'

export function MyProfilePage() {
  const { pushToast } = useToast()
  const { profile, updateProfile } = useEmployeeSession()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [confirmAction, setConfirmAction] = useState<'profile' | 'password' | null>(null)

  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phoneNumber ?? '')
    }
  }, [profile])

  if (!profile) {
    return null
  }

  const executeUpdateProfile = async () => {
    const accessToken = getAccessToken()
    if (!accessToken) return

    setIsUpdatingProfile(true)
    try {
      const updated = await updateMyProfile({
        accessToken,
        phoneNumber,
        photoFile,
      })
      updateProfile(updated)
      setPhotoFile(null)
      pushToast({ tone: 'success', message: 'Profile updated' })
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      const msg = err instanceof Error ? err.message : 'Update profile failed'
      pushToast({ tone: toneFromStatus(statusCode), message: msg })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const executeChangePassword = async () => {
    const accessToken = getAccessToken()
    if (!accessToken) return

    setIsChangingPassword(true)
    try {
      await changeMyPassword({
        accessToken,
        oldPassword,
        newPassword,
      })
      setOldPassword('')
      setNewPassword('')
      pushToast({ tone: 'success', message: 'Password updated' })
    } catch (err) {
      const statusCode =
        err && typeof err === 'object' && 'statusCode' in err
          ? (err as { statusCode?: number }).statusCode
          : undefined
      const msg = err instanceof Error ? err.message : 'Change password failed'
      pushToast({ tone: toneFromStatus(statusCode), message: msg })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const onSubmitProfile = (e: FormEvent) => {
    e.preventDefault()
    setConfirmAction('profile')
  }

  const onSubmitPassword = (e: FormEvent) => {
    e.preventDefault()
    setConfirmAction('password')
  }

  const confirmTitle =
    confirmAction === 'profile'
      ? 'Confirm profile update'
      : confirmAction === 'password'
        ? 'Confirm password change'
        : ''

  return (
    <section className="panel">
      <div className="profile-page-head">
        <Link to="/" className="text-link">
          ← Back to attendance
        </Link>
        <h1 className="page-title">My profile</h1>
      </div>

      <div className="profile-grid profile-grid--page">
        <div className="profile-card">
          <div className="profile-photo">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="profile-img profile-img--large" />
            ) : (
              <div className="profile-img-placeholder profile-img-placeholder--large">
                <PersonPlaceholderIcon className="profile-page-person-svg" />
              </div>
            )}
          </div>
          <div className="profile-meta">
            <div className="profile-name">{profile.name}</div>
            <div className="profile-email">{profile.email}</div>
            <div className="profile-position">{profile.position}</div>
            <div className="profile-phone">Phone: {profile.phoneNumber ?? '-'}</div>
          </div>
        </div>

        <div className="profile-forms">
          <form className="form" onSubmit={onSubmitProfile}>
            <h2 className="form-title">Update profile</h2>

            <label className="field">
              <span>Phone number</span>
              <input
                value={phoneNumber}
                onChange={(ev) => setPhoneNumber(ev.target.value)}
                placeholder="+12345678910"
                type="text"
              />
            </label>

            <label className="field">
              <span>Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(ev) => {
                  const f = ev.target.files?.[0] ?? null
                  setPhotoFile(f)
                }}
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={isUpdatingProfile || confirmAction !== null}
            >
              {isUpdatingProfile ? 'Updating…' : 'Save profile'}
            </button>
          </form>

          <form className="form" onSubmit={onSubmitPassword}>
            <h2 className="form-title">Change password</h2>

            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={oldPassword}
                onChange={(ev) => setOldPassword(ev.target.value)}
                autoComplete="current-password"
              />
            </label>

            <label className="field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(ev) => setNewPassword(ev.target.value)}
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={isChangingPassword || confirmAction !== null}
            >
              {isChangingPassword ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </div>
      </div>

      <ConfirmModal
        open={confirmAction !== null}
        title={confirmTitle}
        message={
          confirmAction === 'profile'
            ? 'Are you sure you want to save your profile changes?'
            : 'Are you sure you want to change your password?'
        }
        confirmText={confirmAction === 'profile' ? 'Save' : 'Change password'}
        cancelText="Cancel"
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction
          setConfirmAction(null)
          if (action === 'profile') {
            await executeUpdateProfile()
          } else if (action === 'password') {
            await executeChangePassword()
          }
        }}
      />
    </section>
  )
}
