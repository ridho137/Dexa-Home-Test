import { Outlet } from 'react-router-dom'
import { useEmployeeSession } from '../../context/EmployeeSessionContext'
import { EmployeeHeader } from './EmployeeHeader'

export function EmployeeLayout() {
  const { profile, userRole, adminAppUrl, logout } = useEmployeeSession()

  if (!profile) {
    return null
  }

  const isAdmin = userRole === 'ADMIN_HR'

  return (
    <div className="app-shell">
      <EmployeeHeader
        profile={profile}
        isAdmin={isAdmin}
        adminAppUrl={adminAppUrl}
        onLogout={() => void logout()}
      />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
