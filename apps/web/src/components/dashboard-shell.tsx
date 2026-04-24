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
import { DashboardOperationalPanel } from "./dashboard-operational-panel";
import { EmptyState, MetricCard, ReadoutGrid, SectionHeader, StatusPill } from "./dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "./glass-card";
import { ZookLogo } from "./zook-logo";
import { formatDate, formatDaysRemaining, formatEnumLabel, titleFromSection } from "@/lib/format";

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

function isActiveNav(href: string, sectionKey: string) {
  if (href === "/dashboard") {
    return sectionKey === "";
  }
  const hrefKey = href.replace("/dashboard/", "");
  return sectionKey === hrefKey || sectionKey.startsWith(`${hrefKey}/`);
}

function metricTone(label: string) {
  if (label.includes("Revenue") || label.includes("attendance")) {
    return "lime" as const;
  }
  if (label.includes("Low stock") || label.includes("queue") || label.includes("Trial")) {
    return "amber" as const;
  }
  if (label.includes("AI")) {
    return "blue" as const;
  }
  return "neutral" as const;
}

export function DashboardShell({
  section,
  data
}: {
  section: string[] | undefined;
  data: Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;
}) {
  const title = titleFromSection(section);
  const sectionKey = section?.join("/") ?? "";
  const activeOrg = data.orgs[0];

  if (!activeOrg) {
    return (
      <main className="min-h-screen px-4 py-4 lg:px-6">
        <div className="mx-auto max-w-[1100px]">
          <GlassCard variant="strong">
            <EmptyState
              title="No active organization is available"
              description="The dashboard session is live, but there is no current organization bound to this view. Re-select the org or re-seed local data."
            />
          </GlassCard>
        </div>
      </main>
    );
  }

  const workflowCards: Array<{
    label: string;
    href: string;
    detail: string;
    tone: PillTone;
  }> = [
    {
      label: "Review attendance",
      href: "/dashboard/attendance/approvals",
      detail: `${data.summary.pendingAttendanceApprovals} approvals waiting`,
      tone: data.summary.pendingAttendanceApprovals > 0 ? "amber" : "lime"
    },
    {
      label: "Process join requests",
      href: "/dashboard/members",
      detail: `${data.summary.joinRequests} membership handoffs`,
      tone: data.summary.joinRequests > 0 ? "amber" : "lime"
    },
    {
      label: "Check inventory risk",
      href: "/dashboard/shop/products",
      detail: `${data.summary.lowStockProducts} low-stock SKUs`,
      tone: data.summary.lowStockProducts > 0 ? "amber" : "blue"
    },
    {
      label: "Inspect audit and AI",
      href: "/dashboard/audit",
      detail: `${data.auditLogCount} audit entries`,
      tone: data.auditLogCount > 0 ? "blue" : "neutral"
    }
  ];

  return (
    <main className="min-h-screen px-4 py-4 lg:px-6">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="sticky top-4 h-fit">
          <GlassCard variant="strong" className="p-4">
            <ZookLogo />
            <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Live organization</p>
              <p className="mt-3 text-lg font-semibold text-white">{activeOrg.name}</p>
              <p className="mt-1 text-sm text-white/48">
                {activeOrg.city}
                {activeOrg.state ? `, ${activeOrg.state}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill value={formatEnumLabel(activeOrg.status)} />
                <StatusPill value={formatEnumLabel(activeOrg.joinMode)} tone="blue" />
              </div>
            </div>

            <nav className="mt-6 grid gap-1">
              {nav.map(([label, href, Icon]) => {
                const active = isActiveNav(href, sectionKey);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                      active
                        ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                        : "text-white/62 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/platform"
              className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
            >
              <Shield size={18} />
              Platform admin
            </Link>

            <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">Ops posture</p>
              <ReadoutGrid
                className="mt-4"
                columns={1}
                items={[
                  {
                    label: "Attendance mode",
                    value: formatEnumLabel(activeOrg.attendanceMode),
                    meta: `${data.summary.pendingAttendanceApprovals} approvals waiting`
                  },
                  {
                    label: "Trial runway",
                    value: formatDaysRemaining(data.summary.trialDaysRemaining),
                    meta: formatDate(activeOrg.trialEndAt)
                  },
                  {
                    label: "Escalation lane",
                    value: activeOrg.contactEmail ?? activeOrg.contactPhone ?? "Desk-owned",
                    meta: "Primary contact for ops issues"
                  }
                ]}
              />
            </div>
          </GlassCard>
        </aside>

        <section className="grid gap-4">
          <GlassCard variant="strong" className="overflow-hidden">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={data.connected ? "lime" : "amber"}>
                    {data.connected ? "Postgres connected" : "Demo fallback"}
                  </Pill>
                  <StatusPill value={formatEnumLabel(activeOrg.status)} />
                  <StatusPill value={formatEnumLabel(activeOrg.joinMode)} tone="blue" />
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                  Premium operating surface for ownership, reception, trainers, and admins. This view stays tied to the same persisted org data and auth boundaries as the API.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/attendance/qr-display"
                  className="zook-focus inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
                >
                  <QrCode size={18} />
                  Display QR
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="zook-focus inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/72 transition hover:bg-white/8"
                >
                  Open reports
                </Link>
              </div>
            </div>
          </GlassCard>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                delta={metric.delta}
                tone={metricTone(metric.label)}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <GlassCard>
              <SectionHeader
                eyebrow="Operator lane"
                title="Immediate workflow queue"
                description="Fast paths into the surfaces that usually need attention before the next rush, shift change, or member callback."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {workflowCards.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{card.label}</p>
                      <Pill tone={card.tone}>{card.detail}</Pill>
                    </div>
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <SectionHeader
                eyebrow="Org posture"
                title="Current run-state"
                description="This keeps the org’s posture readable without needing to leave the current section."
              />
              <ReadoutGrid
                className="mt-5"
                items={[
                  {
                    label: "Location",
                    value: `${activeOrg.city}${activeOrg.state ? `, ${activeOrg.state}` : ""}`,
                    meta: "Current operating geography"
                  },
                  {
                    label: "Join mode",
                    value: formatEnumLabel(activeOrg.joinMode),
                    meta: `${data.summary.joinRequests} inbound requests`
                  },
                  {
                    label: "Attendance mode",
                    value: formatEnumLabel(activeOrg.attendanceMode),
                    meta: `${data.summary.todayAttendance} check-ins today`
                  },
                  {
                    label: "Trial end",
                    value: formatDate(activeOrg.trialEndAt),
                    meta: formatDaysRemaining(data.summary.trialDaysRemaining)
                  }
                ]}
                columns={2}
              />
            </GlassCard>
          </div>

          <DashboardOperationalPanel
            orgId={activeOrg.id}
            sectionKey={sectionKey}
            organization={{
              id: activeOrg.id,
              name: activeOrg.name,
              city: activeOrg.city,
              state: activeOrg.state,
              status: activeOrg.status,
              joinMode: activeOrg.joinMode,
              attendanceMode: activeOrg.attendanceMode,
              trialEndAt: activeOrg.trialEndAt,
              contactEmail: activeOrg.contactEmail,
              contactPhone: activeOrg.contactPhone
            }}
            summary={data.summary}
            auditLogCount={data.auditLogCount}
            initialJoinRequests={data.joinRequests}
            initialNotifications={data.notifications}
            initialProducts={data.products}
            initialAiUsage={data.aiUsage}
          />
        </section>
      </div>
    </main>
  );
}
