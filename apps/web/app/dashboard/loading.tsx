export default function DashboardLoading() {
  return (
    <main
      aria-live="polite"
      aria-label="Loading dashboard section"
      className="zook-shell-bg min-h-dvh overflow-hidden px-3 py-4 sm:px-5 lg:px-6 xl:px-8"
    >
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-[var(--border-subtle)]">
        <div className="h-full w-1/3 animate-[zook-dashboard-loading_900ms_ease-in-out_infinite] rounded-r-full bg-[var(--accent)]" />
      </div>
      <div className="mx-auto grid w-full max-w-[1760px] min-w-0 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh border-y-0 border-l-0 border-r border-[var(--border-strong)] bg-[var(--surface-raised)]/70 p-4 lg:block">
          <div className="h-10 w-36 animate-pulse rounded-full bg-[var(--bg-sunken)]" />
          <div className="mt-8 grid gap-3">
            {Array.from({ length: 11 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-2xl bg-[var(--bg-sunken)]"
              />
            ))}
          </div>
        </aside>
        <section className="grid min-w-0 content-start gap-4">
          <div className="h-20 animate-pulse rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]" />
          <div className="px-1 pt-3 md:px-0">
            <div className="h-10 w-72 animate-pulse rounded-2xl bg-[var(--surface-raised)]" />
            <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-[var(--surface-raised)]" />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
