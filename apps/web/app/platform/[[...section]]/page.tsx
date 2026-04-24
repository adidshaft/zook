import { ShieldAlert } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { requirePlatformSession } from "@/lib/server-auth";
import { ZookLogo } from "@/components/zook-logo";
import { getDashboardData } from "@/lib/data";

export default async function PlatformPage() {
  await requirePlatformSession();
  const data = await getDashboardData();
  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="glass-panel flex items-center justify-between rounded-[28px] p-5">
          <ZookLogo />
          <Pill tone="amber">Platform super-admin</Pill>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.metrics.map((metric) => (
            <GlassCard key={metric.label}>
              {metric.label === "Organizations" ? <ShieldAlert className="text-amber-100" /> : null}
              <p className="mt-4 text-sm text-white/45">{metric.label}</p>
              <p className="metric mt-2 text-4xl font-semibold">{metric.value}</p>
              <p className="mt-2 text-xs text-lime-200">{metric.delta}</p>
            </GlassCard>
          ))}
        </div>
        <GlassCard>
          <h1 className="text-2xl font-semibold">All Organizations</h1>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/8 text-white/45">
                <tr>
                  <th className="px-4 py-3">Gym</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.orgs.map((org) => (
                  <tr key={org.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3 text-white/55">{org.city}</td>
                    <td className="px-4 py-3">
                      <Pill>{org.status}</Pill>
                    </td>
                    <td className="px-4 py-3 text-white/55">PATCH /api/platform/orgs/{org.id}/status</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard>
            <h2 className="text-xl font-semibold">Recent abuse signals</h2>
            <div className="mt-4 grid gap-3">
              {(data.platform?.abuseFlags ?? []).length ? (
                (data.platform?.abuseFlags ?? []).map((flag) => (
                  <div key={flag.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{flag.type}</p>
                      <Pill tone="amber">{flag.severity}</Pill>
                    </div>
                    <p className="mt-2 text-xs text-white/45">{flag.orgId}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/45">No abuse flags in the current seed snapshot.</p>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-xl font-semibold">Platform notes</h2>
            <p className="mt-4 text-sm leading-6 text-white/55">
              Organization status changes, AI usage inspection, and abuse review are now backed by the database and the same auth/session layer used by the rest of the product.
            </p>
            <p className="mt-4 text-sm leading-6 text-white/55">
              Use the platform APIs to suspend or reactivate gyms; the seeded UI intentionally keeps those actions visible as explicit operational steps.
            </p>
          </GlassCard>
        </div>
      </div>
    </main>
  );
}
