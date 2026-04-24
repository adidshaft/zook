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
        <div className="grid gap-4 md:grid-cols-3">
          <GlassCard>
            <ShieldAlert className="text-amber-100" />
            <p className="mt-4 text-sm text-white/45">Organizations</p>
            <p className="metric mt-2 text-4xl font-semibold">{data.orgs.length}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-sm text-white/45">AI usage rows</p>
            <p className="metric mt-2 text-4xl font-semibold">{data.aiUsage.length}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-sm text-white/45">Abuse controls</p>
            <p className="mt-2 text-xl font-semibold">Suspend, reactivate, inspect</p>
          </GlassCard>
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
      </div>
    </main>
  );
}
