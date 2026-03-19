type ChosenApp = 'employee' | 'admin' | null

type Props = {
  userRole: string | null
  selectedApp: ChosenApp
  onOpenApp: (app: Exclude<ChosenApp, null>) => void
  onLogout: () => void
}

export function AuthChooserPanel({
  userRole,
  selectedApp,
  onOpenApp,
  onLogout,
}: Props) {
  const isAdmin = userRole === 'ADMIN_HR'

  return (
    <>
      <h2 className="panel-title">Choose application</h2>
      <p className="panel-subtitle">
        After successful login you can jump into Employee or Admin workspace.
        You can always switch later from within each app.
      </p>

      <div className="app-grid">
        <button
          type="button"
          className="app-card"
          onClick={() => onOpenApp('employee')}
        >
          <div className="app-card-title">Employee App</div>
          <div className="app-card-body">
            View profile, update phone & photo, and manage your WFH attendance.
          </div>
        </button>

        {isAdmin ? (
          <button
            type="button"
            className="app-card"
            onClick={() => onOpenApp('admin')}
          >
            <div className="app-card-title">Admin App</div>
            <div className="app-card-body">
              Manage employees and monitor WFH attendance summary in real time.
            </div>
          </button>
        ) : null}
      </div>

      <div className="chooser-footer">
        <span className="chooser-meta">
          Signed in{userRole ? ` as ${userRole}` : ''}
        </span>
        {selectedApp ? (
          <span className="chooser-meta">Opening {selectedApp} app...</span>
        ) : null}
        <button type="button" className="secondary-button" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </>
  )
}

