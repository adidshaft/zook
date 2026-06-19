import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { MetricCard } from "@/components/dashboard-primitives";
import { GlassCard, Pill } from "@/components/glass-card";
import { requirePlatformSession } from "@/lib/server-auth";
import { ZookLogo } from "@/components/zook-logo";
import { getPlatformDashboardShellData } from "@/lib/data";
import { getPlatformProviderDiagnostics } from "@/server/domains/overview/read-models";
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

const platformNavGroups = [
  {
    label: "Health",
    items: platformNavItems.filter(([, , key]) =>
      ["status", "incidents", "webhooks", "audit"].includes(key),
    ),
  },
  {
    label: "Support",
    items: platformNavItems.filter(([, , key]) =>
      ["users", "payments", "gyms", "subscriptions"].includes(key),
    ),
  },
  {
    label: "Controls",
    items: platformNavItems.filter(([, , key]) =>
      ["broadcasts", "moderation", "impersonations", "flags", "assistant", "safety"].includes(key),
    ),
  },
];

const PlatformOperationsPanel = nextDynamic(
  () =>
    import("@/components/platform-operations-panel").then(
      (module) => module.PlatformOperationsPanel,
    ),
  {
    loading: () => <PlatformPanelSkeleton />,
  },
);

type PlatformShellData = Awaited<ReturnType<typeof getPlatformDashboardShellData>>;
type PlatformProviderStatus = ReturnType<typeof getPlatformProviderDiagnostics>;

function PlatformPanelSkeleton() {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-5 md:p-6">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="mt-4 h-7 w-64 max-w-full rounded-full bg-white/12" />
          <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-white/8" />
          <div className="mt-2 h-4 w-4/5 max-w-lg rounded-full bg-white/8" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["one", "two", "three", "four"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="h-3 w-20 rounded-full bg-white/10" />
                <div className="mt-4 h-7 w-16 rounded-full bg-white/12" />
                <div className="mt-3 h-3 w-32 rounded-full bg-white/8" />
              </div>
            ))}
          </div>
        </div>
        <div className="hidden border-l border-white/10 bg-white/[0.03] p-5 lg:block">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-4 grid gap-3">
            {["a", "b", "c", "d"].map((item) => (
              <div key={item} className="h-16 rounded-2xl bg-black/20" />
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  await requirePlatformSession();
  const { section } = await params;
  const sectionKey = section?.[0] ?? "status";
  const activeAnchor = platformSectionAnchors[sectionKey] ?? "readiness";
  const activeNavLabel =
    platformNavItems.find(([, , key]) => key === sectionKey)?.[0] ?? "Status";

  return (
    <main className="min-h-screen px-3 py-3 md:px-5">
      <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 grid gap-3">
            <GlassCard variant="strong" className="rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <ZookLogo />
                <DashboardSignOutButton compact />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Pill>Production</Pill>
                <Pill>{activeNavLabel}</Pill>
              </div>
            </GlassCard>
            <PlatformNavigation sectionKey={sectionKey} />
          </div>
        </aside>

        <div className="grid min-w-0 content-start gap-4">
          <GlassCard variant="strong" className="rounded-2xl p-4 md:p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 lg:hidden">
                  <Pill>Production</Pill>
                  <Pill>Platform team</Pill>
                  <Pill>{activeNavLabel}</Pill>
                </div>
                <div className="mt-3 min-w-0 lg:mt-0">
                  <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
                    Platform operations
                  </h1>
                  <p className="mt-1 max-w-3xl text-sm leading-5 text-white/55">
                    Production health, support lookup, gym accounts, billing, and risk queues.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 lg:hidden">
                <DashboardSignOutButton compact />
                <ZookLogo />
              </div>
            </div>
          </GlassCard>

          <nav
            aria-label="Platform sections"
            className="no-scrollbar sticky top-3 z-20 overflow-x-auto rounded-2xl border border-white/10 bg-black/82 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl lg:hidden"
          >
            <div className="flex gap-3">
              {platformNavGroups.map((group) => (
                <div
                  key={group.label}
                  className="min-w-[220px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2"
                >
                  <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map(([item, href, key]) => (
                      <Link
                        key={item}
                        href={href}
                        prefetch={false}
                        className={`zook-focus shrink-0 rounded-xl px-3 py-2 text-center text-sm font-medium transition ${
                          key === sectionKey
                            ? "bg-lime-300 text-black"
                            : "border border-white/10 text-white/68 hover:bg-white/8 hover:text-white"
                        }`}
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <Suspense fallback={<PlatformContentSkeleton />}>
            <PlatformDashboardContent activeAnchor={activeAnchor} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function PlatformNavigation({ sectionKey }: { sectionKey: string }) {
  return (
    <nav
      aria-label="Platform sections"
      className="rounded-2xl border border-white/10 bg-black/58 p-2 shadow-[var(--shadow-lg)] backdrop-blur-xl"
    >
      {platformNavGroups.map((group) => (
        <div key={group.label} className="mb-2 last:mb-0">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
            {group.label}
          </p>
          {group.items.map(([item, href, key]) => {
            const isActive = key === sectionKey;
            return (
              <Link
                key={item}
                href={href}
                prefetch={false}
                className={`zook-focus mb-1 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition last:mb-0 ${
                  isActive
                    ? "bg-lime-300 text-black"
                    : "text-white/66 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span>{item}</span>
                {isActive ? <span className="h-2 w-2 rounded-full bg-black/70" /> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function PlatformContentSkeleton() {
  return (
    <>
      <section aria-label="Loading platform metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {["orgs", "trials", "suspended", "assistant", "safety"].map((item) => (
          <GlassCard key={item} variant="strong" className="rounded-[18px] p-4">
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-4 h-8 w-16 rounded-full bg-white/12" />
            <div className="mt-3 h-3 w-32 rounded-full bg-white/8" />
          </GlassCard>
        ))}
      </section>
      <PlatformPanelSkeleton />
    </>
  );
}

async function PlatformDashboardContent({
  activeAnchor,
}: {
  activeAnchor: string;
}) {
  const needsProviderDiagnostics =
    activeAnchor === "readiness" || activeAnchor === "incident-checklist";
  const [data, providerDiagnostics] = await Promise.all([
    getPlatformDashboardShellData(),
    needsProviderDiagnostics ? getPlatformProviderDiagnostics() : Promise.resolve(undefined),
  ]);
  const runtimeLabel = data.connected
    ? "System online"
    : data.fallbackMode === "demo"
      ? "Test data - live data unavailable"
      : "Data unavailable";
  const suspendedCount = data.orgs.filter((org) => org.status === "SUSPENDED").length;
  const safetyReviewCount = data.platform.abuseFlags.filter(
    (flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved",
  ).length;
  const hasAlerts = suspendedCount > 0 || safetyReviewCount > 0;
  const isStatusFirstFold = activeAnchor === "readiness";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={data.connected ? "lime" : "amber"}>{runtimeLabel}</Pill>
        {hasAlerts ? (
          <Pill tone="amber">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Review needed
          </Pill>
        ) : null}
      </div>

      <section aria-label="Platform metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                className="rounded-[18px] p-4 [&_.metric]:text-2xl md:[&_.metric]:text-3xl"
              />
            ))}
          </section>

          {isStatusFirstFold ? (
            <PlatformStatusFirstFold
              data={data}
              providerDiagnostics={providerDiagnostics}
              suspendedCount={suspendedCount}
              safetyReviewCount={safetyReviewCount}
            />
          ) : (
            <PlatformOperationsPanel
              initialSection={activeAnchor}
              initialOrgs={data.orgs.map(serializePlatformOrganization)}
              initialFlags={data.platform.abuseFlags.map(serializePlatformAbuseFlag)}
              initialProviders={providerDiagnostics}
            />
          )}
    </>
  );
}

function PlatformStatusFirstFold({
  data,
  providerDiagnostics,
  suspendedCount,
  safetyReviewCount,
}: {
  data: PlatformShellData;
  providerDiagnostics: PlatformProviderStatus | undefined;
  suspendedCount: number;
  safetyReviewCount: number;
}) {
  const providerEntries = Object.entries(providerDiagnostics ?? {});
  const providerGapCount = providerEntries.filter(([, provider]) =>
    provider.status === "misconfigured" || provider.status === "unsupported",
  ).length;
  const readyProviderCount = providerEntries.filter(([, provider]) =>
    provider.status === "ready" || provider.status === "default",
  ).length;
  const activeGyms = data.orgs.filter((org) => org.status === "ACTIVE").length;

  const rows = [
    {
      label: "Provider setup",
      value: providerGapCount ? `${providerGapCount} gap${providerGapCount === 1 ? "" : "s"}` : "Ready",
      meta: providerGapCount
        ? "Open Incidents or Webhooks for exact provider checks."
        : `${readyProviderCount} providers are reporting usable defaults.`,
      tone: providerGapCount ? "amber" : "neutral",
    },
    {
      label: "Gym accounts",
      value: `${activeGyms} active`,
      meta: `${data.orgs.length} recently loaded accounts in the platform queue.`,
      tone: suspendedCount ? "amber" : "blue",
    },
    {
      label: "Safety",
      value: safetyReviewCount ? `${safetyReviewCount} open` : "Clear",
      meta: safetyReviewCount
        ? "Review unresolved safety reports before expanding traffic."
        : "No unresolved safety reports in the loaded queue.",
      tone: safetyReviewCount ? "amber" : "neutral",
    },
  ] as const;

  return (
    <GlassCard className="overflow-hidden rounded-2xl p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">
                Platform status
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Production command summary
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                Fast view for provider health, tenant risk, and safety load. Open a focused section
                from the left nav for deeper actions.
              </p>
            </div>
            <Pill tone={providerGapCount || safetyReviewCount || suspendedCount ? "amber" : "neutral"}>
              {providerGapCount || safetyReviewCount || suspendedCount ? "Review needed" : "Healthy"}
            </Pill>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <Pill tone={row.tone}>{row.label}</Pill>
                <p className="mt-4 text-2xl font-semibold text-white">{row.value}</p>
                <p className="mt-2 text-sm leading-5 text-white/52">{row.meta}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.03] p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-lime-200" aria-hidden="true" />
            First checks
          </div>
          <div className="mt-4 grid gap-3">
            {[
              `${providerEntries.length || 0} provider categories checked`,
              `${suspendedCount} suspended gym${suspendedCount === 1 ? "" : "s"}`,
              `${data.platform.aiUsageThisMonth} assistant event${data.platform.aiUsageThisMonth === 1 ? "" : "s"} this month`,
            ].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/62">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
