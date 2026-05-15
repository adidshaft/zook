import { AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard-primitives";
import { GlassCard, Pill } from "@/components/glass-card";
import { PlatformOperationsPanel } from "@/components/platform-operations-panel";
import { requirePlatformSession } from "@/lib/server-auth";
import { ZookLogo } from "@/components/zook-logo";
import { getDashboardData } from "@/lib/data";

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
  gyms: "organizations",
  subscriptions: "subscriptions",
  assistant: "ai-traffic",
  safety: "abuse-flags",
};

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  await requirePlatformSession();
  const { section } = await params;
  const sectionKey = section?.[0] ?? "status";
  const activeAnchor = platformSectionAnchors[sectionKey] ?? "readiness";
  const data = await getDashboardData();
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

  return (
    <main className="min-h-screen px-5 py-5">
      <div className="mx-auto grid max-w-[1500px] gap-5">
        <GlassCard variant="strong">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={data.connected ? "lime" : "amber"}>{runtimeLabel}</Pill>
                <Pill tone="amber">Platform team</Pill>
              </div>
              <div className="mt-4 flex items-center gap-3">
                {hasAlerts ? <AlertTriangle className="text-amber-100" /> : null}
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                    Platform overview
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
                    Service status, gym accounts, assistant activity, and safety reviews in one
                    place.
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
          {(
            [
              ["Status", "/platform/status", "status"],
              ["Gyms", "/platform/gyms", "gyms"],
              ["Subscriptions", "/platform/subscriptions", "subscriptions"],
              ["Assistant", "/platform/assistant", "assistant"],
              ["Safety", "/platform/safety", "safety"],
            ] as Array<[string, string, string]>
          ).map(([item, href, key]) => (
            <Link
              key={item}
              href={href}
              className={`zook-focus shrink-0 rounded-full px-4 py-2 text-sm ${key === sectionKey ? "bg-lime-300 text-black" : "border border-white/10 text-white/70"}`}
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
