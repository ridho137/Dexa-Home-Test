import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminSessionProvider, useAdminSession } from './context/AdminSessionContext'
import { LoadingScreen } from './pages/LoadingScreen'
import { EmployeesPage } from './pages/EmployeesPage'
import { AttendanceHistoryPage } from './pages/AttendanceHistoryPage'
import { AdminLayout } from './components/layout/AdminLayout'

function AppRoutes() {
  const { view, refreshBusy, userRole, authAppUrl } = useAdminSession()

  if (view === 'loading') {
    return <LoadingScreen busyText={refreshBusy ? 'Refreshing session…' : 'Loading…'} />
  }

  if (userRole !== 'ADMIN_HR') {
    return <AccessDeniedModal authAppUrl={authAppUrl} />
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/attendance" element={<AttendanceHistoryPage />} />
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminSessionProvider>
        <AppRoutes />
      </AdminSessionProvider>
    </BrowserRouter>
  )
}

function AccessDeniedModal({ authAppUrl }: { authAppUrl: string }) {
  return (
    <div className="confirm-modal-backdrop" role="presentation">
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Access denied">
        <div className="confirm-modal-body">
          <h2 className="confirm-modal-title">ACCESS DENIED</h2>
          <div className="confirm-modal-message">
            You do not have permission to access the Admin application. Please return to choose the
            appropriate application.
          </div>
        </div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              window.location.href = authAppUrl
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
