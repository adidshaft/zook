import { AlertTriangle, RadioTower, ShieldCheck } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";

const platformSections = [
  "Status",
  "Users",
  "Payments",
  "Broadcasts",
  "Moderation",
  "Webhooks",
  "Audit",
  "Flags",
  "Gyms",
  "Subscriptions",
];

const platformMetrics = [
  ["Organizations", "Checking"],
  ["Provider setup", "Checking"],
  ["Safety reviews", "Checking"],
  ["Billing", "Checking"],
];

export default function PlatformLoading() {
  return (
    <main
      aria-live="polite"
      aria-label="Loading platform operations"
      className="min-h-screen px-3 py-3 md:px-5"
    >
      <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-white/10">
        <div className="h-full w-1/3 animate-[zook-dashboard-loading_900ms_ease-in-out_infinite] rounded-r-full bg-lime-300" />
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 grid gap-3">
            <GlassCard variant="strong" className="rounded-2xl p-4">
              <ZookLogo />
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill tone="lime">Production</Pill>
                <Pill tone="blue">Platform</Pill>
              </div>
            </GlassCard>
            <nav className="rounded-2xl border border-white/10 bg-black/58 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
              {platformSections.map((item, index) => (
                <div
                  key={item}
                  className={`mb-1 rounded-xl px-3 py-2.5 text-sm font-medium last:mb-0 ${
                    index === 0 ? "bg-lime-300 text-black" : "text-white/66"
                  }`}
                >
                  {item}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="grid min-w-0 gap-4">
          <GlassCard variant="strong" className="rounded-2xl p-4 md:p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap gap-2 lg:hidden">
                  <Pill tone="lime">Production</Pill>
                  <Pill tone="blue">Status</Pill>
                </div>
                <h1 className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl lg:mt-0">
                  Platform operations
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-white/55">
                  Loading provider health, gym accounts, billing, and risk queues.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-200/10 px-3 py-1.5 text-xs font-medium text-lime-100">
                <RadioTower size={14} />
                Warming live console
              </div>
            </div>
          </GlassCard>

          <nav className="no-scrollbar sticky top-3 z-20 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/82 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl lg:hidden">
            {platformSections.map((item, index) => (
              <div
                key={item}
                className={`shrink-0 rounded-xl px-3 py-2 text-center text-sm font-medium ${
                  index === 0 ? "bg-lime-300 text-black" : "border border-white/10 text-white/68"
                }`}
              >
                {item}
              </div>
            ))}
          </nav>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {platformMetrics.map(([label, value], index) => (
              <GlassCard key={label} className="rounded-[18px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/42">{label}</p>
                  {index === 2 ? (
                    <AlertTriangle size={16} className="text-amber-100" />
                  ) : (
                    <ShieldCheck size={16} className="text-lime-100" />
                  )}
                </div>
                <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-xs text-white/45">Production read model</p>
              </GlassCard>
            ))}
          </section>

          <GlassCard className="overflow-hidden rounded-2xl p-0">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 md:p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">
                  Platform health cockpit
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Status is loading</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                  Preparing provider readiness, operational checks, and the first actionable rows.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {["Database", "SMS", "Payments", "Cache"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm font-medium text-white">{item}</p>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-lime-300/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden border-l border-white/10 bg-white/[0.03] p-5 lg:block">
                <p className="text-xs uppercase tracking-[0.18em] text-white/42">Queues</p>
                <div className="mt-4 grid gap-3">
                  {["Provider checks", "Safety review", "Billing state", "Audit tail"].map((item) => (
                    <div key={item} className="rounded-2xl bg-black/20 p-4 text-sm text-white/68">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
