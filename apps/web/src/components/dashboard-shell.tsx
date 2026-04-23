import Link from "next/link";
import {
  Bell,
  Brain,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  MapPin,
  Package,
  QrCode,
  Shield,
  Store,
  Users
} from "lucide-react";
import { GlassCard, Pill } from "./glass-card";
import { ZookLogo } from "./zook-logo";
import { formatInr, titleFromSection } from "@/lib/format";

const nav = [
  ["Dashboard", "/dashboard", Dumbbell],
  ["Organization", "/dashboard/org", MapPin],
  ["Staff", "/dashboard/staff", Shield],
  ["Members", "/dashboard/members", Users],
  ["Plans", "/dashboard/membership-plans", CreditCard],
  ["Attendance", "/dashboard/attendance", QrCode],
  ["Trainers", "/dashboard/trainers", CalendarCheck],
  ["AI", "/dashboard/ai", Brain],
  ["Notifications", "/dashboard/notifications", Bell],
  ["Shop", "/dashboard/shop/products", Store],
  ["Reports", "/dashboard/reports", Package]
] as const;

const workflows: Array<[string, string, string]> = [
  ["Create membership plan", "/dashboard/membership-plans", "Plans, visits, hybrid validity"],
  ["Approve check-ins", "/dashboard/attendance/approvals", "Suspicious scans and manual overrides"],
  ["Record PT", "/dashboard/pt", "Offline trainer subscriptions"],
  ["Mock checkout", "/checkout/mock/demo", "Hosted payment simulator"],
  ["Broadcast notification", "/dashboard/notifications", "Operational and promotional guardrails"],
  ["Fulfill pickup", "/dashboard/shop/orders", "Pay-online-and-pickup shop"]
];

export function DashboardShell({
  section,
  data
}: {
  section: string[] | undefined;
  data: Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;
}) {
  const title = titleFromSection(section);
  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="glass-panel sticky top-4 h-fit rounded-[28px] p-4">
          <ZookLogo />
          <nav className="mt-8 grid gap-1">
            {nav.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/62 transition hover:bg-white/10 hover:text-white"
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/platform" className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-sm text-white/60">
            <Shield size={18} />
            Platform admin
          </Link>
        </aside>

        <section className="grid gap-4">
          <header className="glass-panel flex flex-col justify-between gap-4 rounded-[28px] p-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Pill tone={data.connected ? "lime" : "amber"}>
                  {data.connected ? "Postgres connected" : "Demo fallback"}
                </Pill>
                <Pill>Trial active</Pill>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                Role-aware command center for owners, admins, receptionists, trainers, and Zook platform operations.
              </p>
            </div>
            <Link href="/dashboard/attendance/qr-display" className="zook-focus inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black">
              <QrCode size={18} />
              Display QR
            </Link>
          </header>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <GlassCard key={metric.label}>
                <p className="text-sm text-white/45">{metric.label}</p>
                <div className="metric mt-3 text-4xl font-semibold">{metric.value}</div>
                <p className="mt-2 text-xs text-lime-200">{metric.delta}</p>
              </GlassCard>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <GlassCard>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Operational Workflows</h2>
                  <p className="mt-1 text-sm text-white/45">Fast paths for the MVP acceptance flows.</p>
                </div>
                <Pill tone="lime">Live</Pill>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {workflows.map(([label, href, body]) => (
                  <Link key={label} href={href} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10">
                    <h3 className="font-medium">{label}</h3>
                    <p className="mt-2 text-sm text-white/45">{body}</p>
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">QR Check-in</h2>
                <QrCode className="text-lime-200" />
              </div>
              <div className="mt-5 grid aspect-square place-items-center rounded-[22px] border border-white/10 bg-black/30">
                <div className="grid h-44 w-44 grid-cols-5 gap-2 rounded-2xl bg-white p-4">
                  {Array.from({ length: 25 }).map((_, index) => (
                    <div key={index} className={index % 3 === 0 || index % 7 === 0 ? "rounded bg-black" : "rounded bg-black/15"} />
                  ))}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/50">Rolling signed tokens refresh every 2-5 minutes and are validated server-side.</p>
            </GlassCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <GlassCard className="xl:col-span-2">
              <h2 className="text-xl font-semibold">Organizations</h2>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/8 text-white/45">
                    <tr>
                      <th className="px-4 py-3 font-medium">Gym</th>
                      <th className="px-4 py-3 font-medium">City</th>
                      <th className="px-4 py-3 font-medium">Join mode</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orgs.map((org) => (
                      <tr key={org.id} className="border-t border-white/10">
                        <td className="px-4 py-3 font-medium">{org.name}</td>
                        <td className="px-4 py-3 text-white/55">{org.city}</td>
                        <td className="px-4 py-3 text-white/55">{org.joinMode}</td>
                        <td className="px-4 py-3">
                          <Pill tone="lime">{org.status}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold">Low Stock</h2>
              <div className="mt-4 grid gap-3">
                {data.products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-white/45">{formatInr(product.pricePaise ?? 0)}</p>
                    </div>
                    <Pill tone={(product.stock ?? 0) <= 8 ? "amber" : "neutral"}>{product.stock} left</Pill>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <GlassCard>
              <h2 className="text-xl font-semibold">Notifications</h2>
              <div className="mt-4 grid gap-3">
                {data.notifications.map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{notification.title}</p>
                      <Pill>{notification.status}</Pill>
                    </div>
                    <p className="mt-2 text-xs text-white/45">{notification.type}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-xl font-semibold">AI Usage</h2>
              <div className="mt-4 grid gap-3">
                {data.aiUsage.map((usage) => (
                  <div key={usage.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{usage.promptSummary}</p>
                      <Pill tone="lime">{usage.role}</Pill>
                    </div>
                    <p className="mt-2 text-xs text-white/45">{usage.requestType}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </main>
  );
}
