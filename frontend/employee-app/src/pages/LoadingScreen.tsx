type Props = { refreshBusy: boolean }

export function LoadingScreen({ refreshBusy }: Props) {
  return (
    <div className="app-shell app-shell--centered">
      <section className="panel panel--narrow">
        <div className="panel-body">
          {refreshBusy ? <div>Refreshing session…</div> : <div>Loading…</div>}
        </div>
      </section>
    </div>
  )
}
