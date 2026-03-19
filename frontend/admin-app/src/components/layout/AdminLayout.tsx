import { Link, Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { useAdminSession } from '../../context/AdminSessionContext'
import { useAdminNotifications } from '../../lib/admin-websocket'
import { AdminHeader } from './AdminHeader'

export function AdminLayout() {
  const { profile, logout } = useAdminSession()
  const location = useLocation()
  const active = useMemo(() => location.pathname, [location.pathname])

  useAdminNotifications()
  const employeeAppUrl = import.meta.env.VITE_EMPLOYEE_APP_URL ?? 'http://localhost:7010'

  return (
    <div className="app-shell">
      <AdminHeader
        profile={profile}
        employeeAppUrl={employeeAppUrl}
        onLogout={() => void logout()}
      />

      <main className="app-main">
        <div className="admin-subnav">
          <Link
            className={active.startsWith('/employees') ? 'nav-link nav-link--active' : 'nav-link'}
            to="/employees"
          >
            Employees
          </Link>
          <Link
            className={active.startsWith('/attendance') ? 'nav-link nav-link--active' : 'nav-link'}
            to="/attendance"
          >
            Attendance History
          </Link>
        </div>

        <div className="admin-main">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

