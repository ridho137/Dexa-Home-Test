export function LoadingScreen({ busyText }: { busyText?: string }) {
  return (
    <section className="panel panel--narrow app-main app-main--centered">
      <div className="loading-spinner" aria-hidden="true" />
      <h2 style={{ marginTop: 12 }}>{busyText ?? 'Loading…'}</h2>
    </section>
  )
}

