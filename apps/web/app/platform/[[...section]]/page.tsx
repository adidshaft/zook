import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard-primitives";
import { GlassCard, Pill } from "@/components/glass-card";
import { PlatformOperationsPanel } from "@/components/platform-operations-panel";
import { requirePlatformSession } from "@/lib/server-auth";
import { ZookLogo } from "@/components/zook-logo";
import { getDashboardData } from "@/lib/data";

function metricTone(label: string) {
  if (label.includes("Suspended") || label.includes("Abuse")) {
    return "amber" as const;
  }
  if (label.includes("AI")) {
    return "blue" as const;
  }
  if (label.includes("Organizations")) {
    return "lime" as const;
  }
  return "neutral" as const;
}

export default async function PlatformPage() {
  await requirePlatformSession();
  const data = await getDashboardData();
  const runtimeLabel = data.connected
    ? "Platform database online"
    : data.fallbackMode === "demo"
      ? "Demo fallback"
      : "Read model unavailable";

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-[1500px] gap-5">
        <GlassCard variant="strong">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={data.connected ? "lime" : "amber"}>
                  {runtimeLabel}
                </Pill>
                <Pill tone="amber">Platform super-admin</Pill>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <ShieldAlert className="text-amber-100" />
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Platform operations</h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                    Registry health, org interventions, AI activity, and abuse review in a single glass control room.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <ZookLogo />
            </div>
          </div>
        </GlassCard>

        <nav className="flex gap-2 overflow-x-auto rounded-[28px] border border-white/10 bg-white/5 p-3">
          {([
            ["Readiness", "#readiness"],
            ["Organizations", "#organizations"],
            ["AI traffic", "#ai-traffic"],
            ["Abuse flags", "#abuse-flags"],
          ] as Array<[string, string]>).map(([item, href], index) => (
            <Link
              key={item}
              href={href}
              className={`zook-focus shrink-0 rounded-full px-4 py-2 text-sm ${index === 0 ? "bg-lime-300 text-black" : "border border-white/10 text-white/70"}`}
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.metrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              delta={metric.delta}
              tone={metricTone(metric.label)}
              icon={metric.label === "Organizations" ? <ShieldAlert size={18} className="text-amber-100" /> : undefined}
            />
          ))}
        </div>

        <PlatformOperationsPanel
          initialOrgs={data.orgs}
          initialFlags={data.platform.abuseFlags}
        />
      </div>
    </main>
  );
}
