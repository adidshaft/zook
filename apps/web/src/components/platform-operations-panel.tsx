"use client";

import { useEffect, useState } from "react";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
  toneFromStatus,
} from "./dashboard-primitives";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";

type PlatformOrganization = {
  id: string;
  name: string;
  username: string;
  city: string;
  state?: string | null;
  status: string;
  joinMode: string;
  createdAt: string | Date;
  trialEndAt: string | Date;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

type PlatformAbuseFlag = {
  id: string;
  orgId: string;
  userId?: string | null;
  type: string;
  severity: string;
  status: string;
  createdAt: string | Date;
  resolvedAt?: string | Date | null;
};

type PlatformUsageRow = {
  id: string;
  orgId?: string | null;
  role: string;
  provider: string;
  requestType: string;
  promptSummary: string;
  costEstimatePaise: number;
  tokenEstimate: number;
  createdAt: string;
};

type PlatformUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isPlatformAdmin?: boolean;
};

type PlatformPaymentRow = {
  id: string;
  orgId?: string | null;
  userId?: string | null;
  amountPaise: number;
  status: string;
  provider?: string | null;
  providerRef?: string | null;
  createdAt: string | Date;
};

type PlatformFlagRow = {
  key: string;
  enabled: boolean;
  description?: string | null;
  rolloutPercent: number;
  overrideOrgIds: string[];
};

type PlatformWebhookAttempt = {
  id: string;
  paymentEventId: string;
  status: string;
  processor?: string | null;
  startedAt: string | Date;
  errorMessage?: string | null;
};

type PlatformAuditRow = {
  id: string;
  orgId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  riskLevel: string;
  createdAt: string | Date;
};

type ProviderDiagnostics = {
  category: string;
  selectedProvider?: string;
  activeProvider: string | null;
  status: string;
  missingEnv?: string[];
  env?: Record<string, boolean>;
  provider?: string;
  mode?: string;
  configured: boolean;
  lastCheckedAt?: string;
  requestId?: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export function PlatformOperationsPanel({
  initialOrgs,
  initialFlags,
  initialSection = "readiness",
}: {
  initialOrgs: PlatformOrganization[];
  initialFlags: PlatformAbuseFlag[];
  initialSection?: string;
}) {
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userRows, setUserRows] = useState<PlatformUserRow[]>([]);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [paymentRows, setPaymentRows] = useState<PlatformPaymentRow[]>([]);
  const [supportNotice, setSupportNotice] = useState("");

  const organizationsState = useOperationalResource<{ orgs: PlatformOrganization[] }>({
    path: "/api/platform/orgs",
    initialData: { orgs: initialOrgs },
  });
  const providersState = useOperationalResource<{ providers: Record<string, ProviderDiagnostics> }>(
    {
      path: "/api/platform/provider-status",
    },
  );
  const usageState = useOperationalResource<{ usage: PlatformUsageRow[] }>({
    path: "/api/platform/ai-usage",
  });
  const flagsState = useOperationalResource<{ flags: PlatformAbuseFlag[] }>({
    path: "/api/platform/abuse-flags",
    initialData: { flags: initialFlags },
  });
  const featureFlagsState = useOperationalResource<{ flags: PlatformFlagRow[] }>({
    path: "/api/platform/flags",
  });
  const webhooksState = useOperationalResource<{ attempts: PlatformWebhookAttempt[] }>({
    path: "/api/platform/webhooks",
  });
  const auditState = useOperationalResource<{ auditLogs: PlatformAuditRow[] }>({
    path: "/api/platform/audit",
  });

  const organizations = organizationsState.data?.orgs ?? initialOrgs;
  const providers = providersState.data?.providers ?? {};
  const providerEntries = Object.entries(providers);
  const usage = usageState.data?.usage ?? [];
  const flags = flagsState.data?.flags ?? initialFlags;
  const featureFlags = featureFlagsState.data?.flags ?? [];
  const webhooks = webhooksState.data?.attempts ?? [];
  const auditLogs = auditState.data?.auditLogs ?? [];

  const misconfiguredProviders = providerEntries.filter(
    ([, provider]) => provider.status === "misconfigured" || provider.status === "unsupported",
  );
  const readyProviders = providerEntries.filter(([, provider]) => provider.status === "ready");
  const defaultProviders = providerEntries.filter(([, provider]) => provider.status === "default");
  const suspendedOrganizations = organizations.filter((org) => org.status === "SUSPENDED");
  const openFlags = flags.filter(
    (flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved",
  );
  const trialRiskOrganizations = organizations.filter((org) => {
    const trialEndAt = new Date(org.trialEndAt).getTime();
    if (!Number.isFinite(trialEndAt) || org.status !== "ACTIVE") return false;
    const daysLeft = Math.ceil((trialEndAt - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 7;
  });
  const cockpitItems = [
    {
      label: "Ready providers",
      value: formatCompactNumber(readyProviders.length),
      meta: "Can serve production traffic",
    },
    {
      label: "Provider setup gaps",
      value: formatCompactNumber(misconfiguredProviders.length),
      meta: "Check env + partner dashboards",
    },
    {
      label: "Active gyms",
      value: formatCompactNumber(
        organizations.filter((org) => org.status === "ACTIVE").length,
      ),
      meta: "Currently allowed to operate",
    },
    {
      label: "Trial risk",
      value: formatCompactNumber(trialRiskOrganizations.length),
      meta: "Active gyms with <= 7 days left",
    },
    {
      label: "Open safety",
      value: formatCompactNumber(openFlags.length),
      meta: "Needs platform decision",
    },
  ];
  const incidentChecklist = [
    {
      step: "Confirm blast radius",
      owner: "Platform",
      signal: `${misconfiguredProviders.length} provider gap${misconfiguredProviders.length === 1 ? "" : "s"} · ${openFlags.length} safety review${openFlags.length === 1 ? "" : "s"}`,
    },
    {
      step: "Check provider dashboards",
      owner: "Ops",
      signal: misconfiguredProviders.length
        ? misconfiguredProviders.map(([category]) => formatEnumLabel(category)).join(", ")
        : "All configured providers report ready/default",
    },
    {
      step: "Freeze risky tenant actions",
      owner: "Support",
      signal: suspendedOrganizations.length
        ? `${suspendedOrganizations.length} paused gym${suspendedOrganizations.length === 1 ? "" : "s"}`
        : "No gym is paused right now",
    },
    {
      step: "Notify pilot owners",
      owner: "Business",
      signal: trialRiskOrganizations.length
        ? `${trialRiskOrganizations.length} active trial${trialRiskOrganizations.length === 1 ? "" : "s"} near conversion`
        : "No active trial expires this week",
    },
  ];

  useEffect(() => {
    document.getElementById(initialSection)?.scrollIntoView({ block: "start" });
  }, [initialSection]);

  async function updateOrganizationStatus(
    orgId: string,
    status: "ACTIVE" | "SUSPENDED" | "CANCELLED",
  ) {
    try {
      setStatusError("");
      setBusyOrgId(orgId);
      await webApiFetch(`/api/platform/orgs/${orgId}/status`, {
        method: "PATCH",
        body: { status },
      });
      organizationsState.reload();
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Unable to update organization status.",
      );
    } finally {
      setBusyOrgId(null);
    }
  }

  async function softDeleteOrganization(orgId: string) {
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    try {
      setStatusError("");
      setBusyOrgId(orgId);
      await webApiFetch(`/api/platform/orgs/${orgId}/soft-delete`, {
        method: "POST",
        body: { reason },
      });
      organizationsState.reload();
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Unable to soft-delete organization.",
      );
    } finally {
      setBusyOrgId(null);
    }
  }

  async function searchUsers() {
    if (!userQuery.trim()) return;
    const response = await webApiFetch<{ users: PlatformUserRow[] }>(
      `/api/platform/users?q=${encodeURIComponent(userQuery.trim())}`,
    );
    setUserRows(response.users);
  }

  async function revokeUserSessions(userId: string) {
    await webApiFetch(`/api/platform/users/${userId}/sessions/revoke`, { method: "POST", body: {} });
    setSupportNotice("Sessions revoked");
  }

  async function startImpersonation(userId: string) {
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await webApiFetch(`/api/platform/users/${userId}/impersonate`, {
      method: "POST",
      body: { reason, ttlMinutes: 15 },
    });
    setSupportNotice("Impersonation started");
  }

  async function searchPayments() {
    const response = await webApiFetch<{ payments: PlatformPaymentRow[] }>(
      `/api/platform/payments?q=${encodeURIComponent(paymentQuery.trim())}`,
    );
    setPaymentRows(response.payments);
  }

  async function refundPayment(paymentId: string) {
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await webApiFetch(`/api/platform/payments/${paymentId}/refund`, {
      method: "POST",
      body: { reason },
    });
    setSupportNotice("Refund submitted");
    await searchPayments();
  }

  async function toggleFeatureFlag(flag: PlatformFlagRow) {
    await webApiFetch("/api/platform/flags", {
      method: "PATCH",
      body: {
        key: flag.key,
        enabled: !flag.enabled,
        rolloutPercent: !flag.enabled ? 100 : 0,
        description: flag.description ?? undefined,
        overrideOrgIds: flag.overrideOrgIds,
      },
    });
    featureFlagsState.reload();
  }

  async function replayWebhook(attemptId: string) {
    await webApiFetch(`/api/platform/webhooks/${attemptId}/replay`, { method: "POST", body: {} });
    setSupportNotice("Webhook replayed");
    webhooksState.reload();
  }

  return (
    <div className="grid gap-4">
      <GlassCard>
        <SectionHeader
          eyebrow="Command"
          title="Platform health cockpit"
          description="Production-facing signal for provider setup, tenant health, conversion risk, and safety load."
          badge={
            <Pill tone={misconfiguredProviders.length || openFlags.length ? "amber" : "lime"}>
              {misconfiguredProviders.length || openFlags.length ? "Review needed" : "Healthy"}
            </Pill>
          }
        />
        <ReadoutGrid className="mt-5" items={cockpitItems} columns={4} />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Provider alerts",
              body: misconfiguredProviders.length
                ? `${misconfiguredProviders.length} service${misconfiguredProviders.length === 1 ? "" : "s"} need setup before full production confidence.`
                : "Core providers are not reporting setup blockers.",
              tone: misconfiguredProviders.length ? "amber" : "lime",
            },
            {
              title: "Gym activation",
              body: `${organizations.length} gym account${organizations.length === 1 ? "" : "s"} visible. ${trialRiskOrganizations.length} active trial${trialRiskOrganizations.length === 1 ? "" : "s"} need renewal follow-up.`,
              tone: trialRiskOrganizations.length ? "amber" : "blue",
            },
            {
              title: "Safety queue",
              body: openFlags.length
                ? "Review open reports before expanding pilot traffic."
                : "No unresolved safety reports in the loaded queue.",
              tone: openFlags.length ? "amber" : "lime",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4"
            >
              <StatusPill value={item.title} tone={item.tone as "amber" | "blue" | "lime"} />
              <p className="mt-3 text-sm leading-6 text-white/58">{item.body}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div id="support-console" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Support"
            title="Platform support console"
            badge={supportNotice ? <Pill tone="lime">{supportNotice}</Pill> : <Pill tone="blue">Live</Pill>}
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Email, phone, or name"
                />
                <ZookButton size="sm" onClick={() => void searchUsers()}>
                  Search users
                </ZookButton>
              </div>
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: "user",
                      header: "User",
                      render: (user) => (
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="mt-1 text-xs text-white/45">{user.email}</p>
                        </div>
                      ),
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      align: "right",
                      render: (user) => (
                        <div className="flex flex-wrap justify-end gap-2">
                          <ZookButton size="sm" tone="ghost" onClick={() => void revokeUserSessions(user.id)}>
                            Revoke
                          </ZookButton>
                          <ZookButton
                            size="sm"
                            tone="danger"
                            disabled={Boolean(user.isPlatformAdmin)}
                            onClick={() => void startImpersonation(user.id)}
                          >
                            Impersonate
                          </ZookButton>
                        </div>
                      ),
                    },
                  ]}
                  rows={userRows}
                  rowKey={(user) => user.id}
                  empty="No users loaded."
                />
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none"
                  value={paymentQuery}
                  onChange={(event) => setPaymentQuery(event.target.value)}
                  placeholder="Payment id, phone, amount"
                />
                <ZookButton size="sm" onClick={() => void searchPayments()}>
                  Search payments
                </ZookButton>
              </div>
              <div className="mt-4">
                <DataTable
                  columns={[
                    {
                      id: "payment",
                      header: "Payment",
                      render: (payment) => (
                        <div>
                          <p className="font-medium text-white">{payment.id}</p>
                          <p className="mt-1 text-xs text-white/45">{payment.providerRef ?? "Manual"}</p>
                        </div>
                      ),
                    },
                    {
                      id: "amount",
                      header: "Amount",
                      render: (payment) => formatInr(payment.amountPaise),
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (payment) => <StatusPill value={formatEnumLabel(payment.status)} />,
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      align: "right",
                      render: (payment) => (
                        <ZookButton size="sm" tone="ghost" onClick={() => void refundPayment(payment.id)}>
                          Refund
                        </ZookButton>
                      ),
                    },
                  ]}
                  rows={paymentRows}
                  rowKey={(payment) => payment.id}
                  empty="No payments loaded."
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <GlassCard>
          <SectionHeader eyebrow="Flags" title="Feature flags" />
          <div className="mt-5 grid gap-3">
            {featureFlags.slice(0, 8).map((flag) => (
              <div key={flag.key} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{flag.key}</p>
                    <p className="mt-1 text-xs text-white/45">{flag.rolloutPercent}% rollout</p>
                  </div>
                  <ZookButton
                    size="sm"
                    tone={flag.enabled ? "danger" : "ghost"}
                    aria-label={`${flag.enabled ? "Disable" : "Enable"} ${flag.key}`}
                    onClick={() => void toggleFeatureFlag(flag)}
                  >
                    {flag.enabled ? "Disable" : "Enable"}
                  </ZookButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader eyebrow="Webhooks" title="Webhook monitor" />
          <div className="mt-5 grid gap-3">
            {webhooks.slice(0, 8).map((attempt) => (
              <div key={attempt.id} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <StatusPill value={formatEnumLabel(attempt.status)} />
                    <p className="mt-2 text-xs text-white/45">{formatDateTime(attempt.startedAt)}</p>
                  </div>
                  <ZookButton size="sm" tone="ghost" onClick={() => void replayWebhook(attempt.id)}>
                    Replay
                  </ZookButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader eyebrow="Audit" title="Global audit" />
          <div className="mt-5 grid gap-3">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                <p className="font-medium text-white">{log.action}</p>
                <p className="mt-1 text-xs text-white/45">
                  {formatEnumLabel(log.riskLevel)} · {formatDateTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div id="readiness" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="System checks"
            title="Service status"
            description="A quick view of the services Zook depends on. Private settings stay hidden."
            badge={
              <Pill tone={misconfiguredProviders.length ? "red" : "lime"}>
                {misconfiguredProviders.length} need setup
              </Pill>
            }
            action={
              <ZookButton size="sm" onClick={() => providersState.reload()}>
                Check again
              </ZookButton>
            }
          />
          <div className="mt-5 grid gap-4">
            <ReadoutGrid
              items={[
                {
                  label: "Ready",
                  value: formatCompactNumber(readyProviders.length),
                  meta: "Services ready for use",
                },
                {
                  label: "Basic setup",
                  value: formatCompactNumber(defaultProviders.length),
                  meta: "Services using the standard setup",
                },
                {
                  label: "Needs attention",
                  value: formatCompactNumber(misconfiguredProviders.length),
                  meta: "Services that still need setup",
                },
                {
                  label: "Open safety reviews",
                  value: formatCompactNumber(openFlags.length),
                  meta: "Reports still needing review",
                },
              ]}
              columns={4}
            />
            <DataTable
              columns={[
                {
                  id: "provider",
                  header: "Service",
                  render: ([category, provider]) => (
                    <div>
                      <p className="font-medium text-white">{formatEnumLabel(category)}</p>
                      <p className="mt-1 text-xs text-white/45">
                        Setup {provider.configured ? "complete" : "needed"} · Running{" "}
                        {provider.activeProvider ? "ready" : "not ready"}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  render: ([, provider]) => (
                    <StatusPill
                      value={formatEnumLabel(provider.status)}
                      tone={
                        provider.status === "misconfigured" || provider.status === "unsupported"
                          ? "red"
                          : provider.status === "default"
                            ? "blue"
                            : toneFromStatus(provider.status)
                      }
                    />
                  ),
                },
                {
                  id: "mode",
                  header: "Mode",
                  render: ([category, provider]) =>
                    formatEnumLabel(provider.mode ?? provider.selectedProvider ?? category),
                },
                {
                  id: "env",
                  header: "Needs",
                  render: ([, provider]) =>
                    (provider.missingEnv?.length ?? 0) ? "Setup required" : "Nothing",
                },
                {
                  id: "last",
                  header: "Checked",
                  render: ([, provider]) =>
                    provider.lastCheckedAt ? formatDateTime(provider.lastCheckedAt) : "Just now",
                },
              ]}
              rows={providerEntries}
              rowKey={([category]) => category}
              empty="Service status is not available yet."
            />
          </div>
        </GlassCard>
      </div>

      <div id="incident-checklist" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Incident mode"
            title="Production incident checklist"
            description="A simple first-response lane for provider outages, payment trouble, safety escalations, and tenant-impacting issues."
            badge={<Pill tone="amber">Use during live support</Pill>}
          />
          <div className="mt-5 grid gap-3">
            {incidentChecklist.map((item, index) => (
              <div
                key={item.step}
                className="grid gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 md:grid-cols-[80px_1fr_0.85fr]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                  Step {index + 1}
                </p>
                <div>
                  <p className="font-medium text-white">{item.step}</p>
                  <p className="mt-1 text-xs text-white/45">Owner: {item.owner}</p>
                </div>
                <p className="text-sm leading-6 text-white/58">{item.signal}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-[22px] border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/82">
            In production, keep destructive tenant actions paused until provider status, audit
            trail, customer impact, and rollback owner are all known.
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div id="organizations" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Organizations"
              title="Gym accounts"
              description="Review active gyms and pause accounts when the platform team needs to step in."
              badge={
                <Pill tone={suspendedOrganizations.length ? "amber" : "lime"}>
                  {suspendedOrganizations.length} suspended
                </Pill>
              }
            />
            {statusError ? (
              <div className="mt-5">
                <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  {statusError}
                </p>
              </div>
            ) : null}
            {organizationsState.error ? (
              <div className="mt-5">
                <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  {organizationsState.error}
                </p>
              </div>
            ) : null}
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    id: "org",
                    header: "Organization",
                    render: (org) => (
                      <div>
                        <p className="font-medium text-white">{org.name}</p>
                        <p className="mt-1 text-xs text-white/45">@{org.username}</p>
                      </div>
                    ),
                  },
                  {
                    id: "city",
                    header: "Location",
                    render: (org) => `${org.city}${org.state ? `, ${org.state}` : ""}`,
                  },
                  {
                    id: "join",
                    header: "Join mode",
                    render: (org) => formatEnumLabel(org.joinMode),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (org) => <StatusPill value={formatEnumLabel(org.status)} />,
                  },
                  {
                    id: "trial",
                    header: "Trial end",
                    render: (org) => formatDate(org.trialEndAt),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    render: (org) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        {(["ACTIVE", "SUSPENDED", "CANCELLED"] as const).map((nextStatus) => (
                          <ZookButton
                            key={nextStatus}
                            tone={nextStatus === "CANCELLED" ? "danger" : "ghost"}
                            size="sm"
                            onClick={() => void updateOrganizationStatus(org.id, nextStatus)}
                            disabled={busyOrgId === org.id || org.status === nextStatus}
                          >
                            {nextStatus === "ACTIVE"
                              ? "Activate"
                              : nextStatus === "SUSPENDED"
                                ? "Suspend"
                                : "Cancel"}
                          </ZookButton>
                        ))}
                        <ZookButton
                          tone="danger"
                          size="sm"
                          onClick={() => void softDeleteOrganization(org.id)}
                          disabled={busyOrgId === org.id || org.status === "DELETED"}
                        >
                          Soft delete
                        </ZookButton>
                      </div>
                    ),
                    align: "right",
                  },
                ]}
                rows={organizations}
                rowKey={(org) => org.id}
                empty="No organizations are currently available."
              />
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4">
          <GlassCard>
            <SectionHeader
              eyebrow="Watchlist"
              title="Safety review"
              description="A short view of gyms and reports that may need attention."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Open safety reviews",
                  value: formatCompactNumber(openFlags.length),
                  meta: "Reports still waiting for review",
                },
                {
                  label: "Paused gyms",
                  value: formatCompactNumber(suspendedOrganizations.length),
                  meta: "Currently paused by the platform team",
                },
                {
                  label: "Recent assistant activity",
                  value: formatCompactNumber(usage.length),
                  meta: "Recent assisted drafts across gyms",
                },
              ]}
            />
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Contacts"
              title="Gym contact list"
              description="The first people to contact when a gym needs help or review."
            />
            <div className="mt-5 grid gap-3">
              {organizations.slice(0, 4).map((org) => (
                <div key={org.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <p className="font-medium text-white">{org.name}</p>
                  <p className="mt-2 text-sm text-white/55">
                    {org.contactEmail ?? org.contactPhone ?? "No contact captured"}
                  </p>
                  <p className="mt-2 text-xs text-white/40">Created {formatDate(org.createdAt)}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div id="ai-traffic" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Assistant"
              title="Recent assistant activity"
              description="A quick view of assisted drafts across gyms."
              badge={<Pill tone="blue">{usage.length} events</Pill>}
            />
            <div className="mt-5">
              {usageState.error ? (
                <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  {usageState.error}
                </p>
              ) : usageState.loading && usage.length === 0 ? (
                <EmptyState
                  title="Loading activity"
                  description="Getting the latest assisted drafts."
                />
              ) : (
                <DataTable
                  columns={[
                    {
                      id: "prompt",
                      header: "Draft",
                      render: (row) => (
                        <div>
                          <p className="font-medium text-white">{row.promptSummary}</p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.orgId ? "Gym account" : "Platform account"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "type",
                      header: "Category",
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          <StatusPill value={formatEnumLabel(row.requestType)} />
                        </div>
                      ),
                    },
                    {
                      id: "tokens",
                      header: "Size",
                      align: "right",
                      render: (row) => (row.tokenEstimate > 0 ? "Detailed" : "Short"),
                    },
                    {
                      id: "cost",
                      header: "Cost",
                      align: "right",
                      render: (row) => formatInr(row.costEstimatePaise),
                    },
                  ]}
                  rows={usage}
                  rowKey={(row) => row.id}
                  empty="No assistant activity is currently available."
                />
              )}
            </div>
          </GlassCard>
        </div>

        <PlatformSubscriptionsSection />

        <div id="abuse-flags" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Safety"
              title="Recent reports"
              description="Recent gym reports, with severity and current status."
              badge={
                <Pill tone={openFlags.length ? "amber" : "lime"}>{openFlags.length} open</Pill>
              }
            />
            <div className="mt-5 grid gap-3">
              {flagsState.error ? (
                <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                  {flagsState.error}
                </p>
              ) : flags.length ? (
                flags.slice(0, 10).map((flag) => (
                  <div
                    key={flag.id}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(flag.type)}</p>
                        <p className="mt-2 text-xs text-white/45">
                          {flag.userId ? "Member report" : "Gym report"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          value={formatEnumLabel(flag.severity)}
                          tone={
                            flag.severity.toLowerCase().includes("high")
                              ? "red"
                              : flag.severity.toLowerCase().includes("medium")
                                ? "amber"
                                : "blue"
                          }
                        />
                        <StatusPill
                          value={formatEnumLabel(flag.status)}
                          tone={toneFromStatus(flag.status)}
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-white/40">
                      {formatDateTime(flag.createdAt)}
                      {flag.resolvedAt ? ` · Resolved ${formatDateTime(flag.resolvedAt)}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No recent reports"
                  description="Nothing needs platform review right now."
                />
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

type SubscriptionSummary = {
  totalOrgs: number;
  onTrial: number;
  active: number;
  suspended: number;
  cancelled: number;
  totalReferrals: number;
};

type SubscriptionRow = {
  orgId: string;
  orgName: string;
  username: string;
  orgStatus: string;
  trialEndAt: string | Date | null;
  createdAt: string | Date;
  contactEmail: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | Date | null;
  mandateStatus: string | null;
  mandateNextChargeAt: string | Date | null;
  mandatePaidCount: number;
  referredCount: number;
};

function PlatformSubscriptionsSection() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    webApiFetch<{ summary: SubscriptionSummary; rows: SubscriptionRow[] }>(
      "/api/platform/subscriptions",
    )
      .then((payload) => {
        if (!mounted) return;
        setSummary(payload.summary);
        setRows(payload.rows);
      })
      .catch((cause) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load subscriptions.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div id="subscriptions" className="scroll-mt-5">
      <GlassCard>
        <SectionHeader
          eyebrow="Subscriptions"
          title="Gym subscriptions"
          description="SaaS billing status, autopay mandates, and platform referrals across every gym."
        />
        {summary ? (
          <ReadoutGrid
            className="mt-5"
            items={[
              {
                label: "Total gyms",
                value: formatCompactNumber(summary.totalOrgs),
                meta: "All accounts",
              },
              {
                label: "On trial",
                value: formatCompactNumber(summary.onTrial),
                meta: "Active + expiring",
              },
              {
                label: "Paying",
                value: formatCompactNumber(summary.active),
                meta: "Status active",
              },
              {
                label: "Suspended",
                value: formatCompactNumber(summary.suspended),
                meta: "Needs review",
              },
              {
                label: "Cancelled",
                value: formatCompactNumber(summary.cancelled),
                meta: "Off platform",
              },
              {
                label: "Referrals",
                value: formatCompactNumber(summary.totalReferrals),
                meta: "Gym-to-gym",
              },
            ]}
            columns={3}
          />
        ) : null}
        <div className="mt-5">
          {error ? (
            <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : loading ? (
            <p className="text-sm text-white/45">Loading subscriptions...</p>
          ) : rows.length ? (
            <DataTable<SubscriptionRow>
              columns={[
                {
                  id: "name",
                  header: "Gym",
                  render: (row: SubscriptionRow) => (
                    <div>
                      <p className="font-medium text-white">{row.orgName}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {row.username} · {row.contactEmail ?? "no email"}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (row: SubscriptionRow) => (
                    <StatusPill
                      value={formatEnumLabel(row.orgStatus)}
                      tone={toneFromStatus(row.orgStatus)}
                    />
                  ),
                },
                {
                  id: "trial",
                  header: "Trial end",
                  render: (row: SubscriptionRow) => (row.trialEndAt ? formatDate(row.trialEndAt) : "—"),
                },
                {
                  id: "mandate",
                  header: "Autopay",
                  render: (row: SubscriptionRow) =>
                    row.mandateStatus ? (
                      <div>
                        <StatusPill
                          value={formatEnumLabel(row.mandateStatus)}
                          tone={toneFromStatus(row.mandateStatus)}
                        />
                        <p className="mt-1 text-xs text-white/45">
                          {row.mandatePaidCount} cycles paid
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-white/45">Not set up</span>
                    ),
                },
                {
                  id: "nextCharge",
                  header: "Next charge",
                  render: (row: SubscriptionRow) =>
                    row.mandateNextChargeAt
                      ? formatDate(row.mandateNextChargeAt)
                      : row.nextBillingAt
                        ? formatDate(row.nextBillingAt)
                        : "—",
                },
                {
                  id: "referred",
                  header: "Gyms referred",
                  render: (row: SubscriptionRow) =>
                    row.referredCount > 0 ? (
                      <Pill tone="blue">{row.referredCount}</Pill>
                    ) : (
                      <span className="text-xs text-white/45">0</span>
                    ),
                },
              ]}
              rows={rows}
              rowKey={(row) => row.orgId}
              empty="No gyms found."
            />
          ) : (
            <EmptyState
              title="No subscriptions yet"
              description="When gyms sign up they'll appear here with trial and billing state."
            />
          )}
        </div>
      </GlassCard>
    </div>
  );
}
