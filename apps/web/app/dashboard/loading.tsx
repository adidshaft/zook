export default function DashboardLoading() {
  const navGroups = [
    ["Operations", ["Today"]],
    ["Members", ["Members", "Plans", "Payments", "Attendance", "Shop", "Reports", "Team"]],
    ["Settings", ["Billing", "Branches", "Activity"]],
  ] as const;
  const metrics = ["Active members", "Today's check-ins", "Revenue today", "Join requests"];

  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard section"
      className="zook-shell-bg min-h-dvh overflow-hidden px-3 py-4 sm:px-5 lg:px-6 xl:px-8"
    >
      <div role="status" aria-live="polite" className="sr-only">
        Loading dashboard section.
      </div>
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-[var(--border-subtle)]">
        <div className="h-full w-1/3 animate-[zook-dashboard-loading_900ms_ease-in-out_infinite] rounded-r-full bg-[var(--accent)]" />
      </div>

      <div className="mx-auto grid w-full max-w-[1760px] min-w-0 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh border-y-0 border-l-0 border-r border-[var(--border-strong)] bg-[var(--surface-raised)]/72 p-4 lg:block">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)]/80 p-4">
            <div className="text-lg font-semibold text-[var(--text-primary)]">Zook</div>
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">Gym OS</div>
          </div>
          <div className="mt-7 grid gap-5">
            {navGroups.map(([group, items]) => (
              <div key={group}>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  {group}
                </p>
                <div className="mt-2 grid gap-1">
                  {items.map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-2xl px-3 py-2.5 text-sm ${
                        index === 0 && group === "Operations"
                          ? "bg-[var(--accent)]/18 text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="grid min-w-0 content-start gap-4">
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/86 p-4 shadow-[var(--shadow-lg)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
                  Loading organization
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Loading live command board
                </p>
              </div>
              <div className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                Production
              </div>
            </div>
          </div>

          <div className="px-1 pt-3 md:px-0">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              Today's Command Board
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Preparing real-time gym operations, attendance, revenue, and member signals.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)]/82 p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {metric}
                </p>
                <div className="mt-4 h-8 w-20 rounded-full bg-[var(--bg-sunken)]" />
                <div className="mt-3 h-3 w-28 rounded-full bg-[var(--bg-sunken)]" />
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="min-h-56 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/72 p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Revenue and check-ins
              </p>
              <div className="mt-6 grid h-32 grid-cols-7 items-end gap-3">
                {[28, 42, 36, 54, 48, 62, 38].map((height, index) => (
                  <div
                    key={index}
                    className="rounded-t-2xl bg-[var(--accent)]/22"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="min-h-56 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/72 p-5">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Next best actions
              </p>
              <div className="mt-5 rounded-2xl bg-[var(--bg-sunken)] p-4 text-sm text-[var(--text-secondary)]">
                Loading the highest priority gym actions.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
