import { AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard-primitives";
import { GlassCard, Pill } from "@/components/glass-card";
import { PlatformOperationsPanel } from "@/components/platform-operations-panel";
import { requirePlatformSession } from "@/lib/server-auth";
import { ZookLogo } from "@/components/zook-logo";
import { getPlatformDashboardShellData } from "@/lib/data";
import { DashboardSignOutButton } from "@/components/dashboard-sign-out-button";

export const dynamic = "force-dynamic";

function serializePlatformOrganization(org: {
  id: string;
  name: string;
  username: string;
  city: string | null;
  state?: string | null;
  status: string;
  joinMode: string;
  trialEndAt: Date | string | null;
  createdAt: Date | string;
  contactEmail?: string | null;
  contactPhone?: string | null;
}) {
  return {
    id: org.id,
    name: org.name,
    username: org.username,
    city: org.city ?? "",
    state: org.state ?? null,
    status: org.status,
    joinMode: org.joinMode,
    trialEndAt: org.trialEndAt ? new Date(org.trialEndAt).toISOString() : "",
    createdAt: new Date(org.createdAt).toISOString(),
    contactEmail: org.contactEmail ?? null,
    contactPhone: org.contactPhone ?? null,
  };
}

function serializePlatformAbuseFlag(flag: {
  id: string;
  orgId: string;
  userId?: string | null;
  type: string;
  severity: string;
  status: string;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
}) {
  return {
    id: flag.id,
    orgId: flag.orgId,
    userId: flag.userId ?? null,
    type: flag.type,
    severity: flag.severity,
    status: flag.status,
    createdAt: new Date(flag.createdAt).toISOString(),
    resolvedAt: flag.resolvedAt ? new Date(flag.resolvedAt).toISOString() : null,
  };
}

const platformSectionAnchors: Record<string, string> = {
  status: "readiness",
  users: "users",
  payments: "payments",
  webhooks: "webhooks",
  audit: "audit",
  flags: "feature-flags",
  broadcasts: "broadcasts",
  moderation: "moderation",
  impersonations: "impersonations",
  gyms: "organizations",
  subscriptions: "subscriptions",
  assistant: "ai-traffic",
  safety: "abuse-flags",
  incidents: "incident-checklist",
};

const platformNavItems: Array<[string, string, string]> = [
  ["Status", "/platform/status", "status"],
  ["Users", "/platform/users", "users"],
  ["Payments", "/platform/payments", "payments"],
  ["Broadcasts", "/platform/broadcasts", "broadcasts"],
  ["Moderation", "/platform/moderation", "moderation"],
  ["Impersonations", "/platform/impersonations", "impersonations"],
  ["Webhooks", "/platform/webhooks", "webhooks"],
  ["Audit", "/platform/audit", "audit"],
  ["Flags", "/platform/flags", "flags"],
  ["Gyms", "/platform/gyms", "gyms"],
  ["Subscriptions", "/platform/subscriptions", "subscriptions"],
  ["Assistant", "/platform/assistant", "assistant"],
  ["Safety", "/platform/safety", "safety"],
  ["Incidents", "/platform/incidents", "incidents"],
];

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  await requirePlatformSession();
  const { section } = await params;
  const sectionKey = section?.[0] ?? "status";
  const activeAnchor = platformSectionAnchors[sectionKey] ?? "readiness";
  const data = await getPlatformDashboardShellData();
  const runtimeLabel = data.connected
    ? "System online"
    : data.fallbackMode === "demo"
      ? "Demo data — production data unavailable"
      : "Data unavailable";
  const suspendedCount = data.orgs.filter((org) => org.status === "SUSPENDED").length;
  const safetyReviewCount = data.platform.abuseFlags.filter(
    (flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved",
  ).length;
  const hasAlerts = suspendedCount > 0 || safetyReviewCount > 0;

  const activeNavLabel =
    platformNavItems.find(([, , key]) => key === sectionKey)?.[0] ?? "Status";

  return (
    <main className="min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto grid max-w-[1440px] gap-4">
        <GlassCard variant="strong" className="p-4 md:p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={data.connected ? "lime" : "amber"}>{runtimeLabel}</Pill>
                <Pill tone="amber">Platform team</Pill>
                <Pill tone="blue">{activeNavLabel}</Pill>
              </div>
              <div className="mt-3 flex items-center gap-3">
                {hasAlerts ? <AlertTriangle className="h-5 w-5 text-amber-100" /> : null}
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    Platform operations
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-white/55">
                    Fast lane for production health, support lookups, gym accounts, and risk queues.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <DashboardSignOutButton compact />
              <ZookLogo />
            </div>
          </div>
        </GlassCard>

        <nav className="sticky top-3 z-20 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/72 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          {platformNavItems.map(([item, href, key]) => (
            <Link
              key={item}
              href={href}
              className={`zook-focus shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition ${
                key === sectionKey
                  ? "bg-lime-300 text-black"
                  : "border border-white/10 text-white/68 hover:bg-white/8 hover:text-white"
              }`}
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
              tone={
                (metric.label.includes("Suspended") && suspendedCount > 0) ||
                (metric.label.includes("Safety") && safetyReviewCount > 0)
                  ? "amber"
                  : "neutral"
              }
              icon={
                metric.label.includes("Safety") && safetyReviewCount > 0 ? (
                  <ShieldAlert size={18} className="text-amber-100" />
                ) : undefined
              }
            />
          ))}
        </div>

        <PlatformOperationsPanel
          initialSection={activeAnchor}
          initialOrgs={data.orgs.map(serializePlatformOrganization)}
          initialFlags={data.platform.abuseFlags.map(serializePlatformAbuseFlag)}
        />
      </div>
    </main>
  );
}
