import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EmployeeLayout } from './components/layout/EmployeeLayout'
import { EmployeeSessionProvider, useEmployeeSession } from './context/EmployeeSessionContext'
import { HomePage } from './pages/HomePage'
import { LoadingScreen } from './pages/LoadingScreen'
import { MyProfilePage } from './pages/MyProfilePage'

function AppRoutes() {
  const { view, refreshBusy, profile } = useEmployeeSession()

  if (view === 'loading' || !profile) {
    return <LoadingScreen refreshBusy={refreshBusy} />
  }

  return (
    <Routes>
      <Route element={<EmployeeLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <EmployeeSessionProvider>
        <AppRoutes />
      </EmployeeSessionProvider>
    </BrowserRouter>
  )
}
