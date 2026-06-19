"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
  toneFromStatus,
} from "./dashboard-primitives";
import { ConfirmActionButton } from "./confirm-action-button";
import { GlassCard, Pill } from "./glass-card";
import { ZookButton } from "./zook-button";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatEnumLabel,
  formatInr,
  formatUsageLimit,
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
  createdAt?: string | Date;
};

function typedConfirmation(prompt: string, expected: string) {
  return window.prompt(`${prompt}\n\nType ${expected} to continue.`)?.trim() === expected;
}

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

type PlatformUserDetail = {
  user: PlatformUserRow & {
    privateHandle?: string;
    slug?: string | null;
    createdAt?: string | Date;
    lastLoginAt?: string | Date | null;
  };
  sessions: Array<{
    id: string;
    createdAt: string | Date;
    lastSeenAt?: string | Date | null;
    expiresAt: string | Date;
    revokedAt?: string | Date | null;
  }>;
  organizations: Array<{
    orgId: string;
    status: string;
    joinedAt: string | Date;
    roles: string[];
    organization?: {
      name: string;
      username: string;
      status: string;
      city?: string | null;
      state?: string | null;
    } | null;
  }>;
  payments: PlatformPaymentRow[];
  auditLogs: PlatformAuditRow[];
};

type PlatformPaymentDetail = {
  payment: PlatformPaymentRow & {
    currency?: string | null;
    mode?: string | null;
    receiptNumber?: string | null;
    recordedAt?: string | Date | null;
    metadata?: unknown;
  };
  user: PlatformUserRow | null;
  organization: PlatformOrganization | null;
  refunds: Array<{
    id: string;
    amountPaise: number;
    status: string;
    providerRefundId?: string | null;
    reason?: string | null;
    createdAt: string | Date;
  }>;
  events: Array<{
    id: string;
    type?: string | null;
    status?: string | null;
    providerEventId?: string | null;
    processingError?: string | null;
    createdAt: string | Date;
    attempts?: Array<{
      id: string;
      status: string;
      processor?: string | null;
      startedAt: string | Date;
      errorMessage?: string | null;
    }>;
  }>;
};

type PlatformBroadcastRow = {
  id: string;
  title: string;
  body: string;
  severity: string;
  status: string;
  targetOrgIds: string[];
  targetRoles: string[];
  scheduledAt?: string | Date | null;
  expiresAt?: string | Date | null;
  publishedAt?: string | Date | null;
  createdAt: string | Date;
};

type PlatformModerationRow = {
  id: string;
  orgId: string;
  kind: string;
  targetId?: string | null;
  status: string;
  reason?: string | null;
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
};

type PlatformImpersonationRow = {
  id: string;
  platformAdminUserId: string;
  targetUserId: string;
  targetOrgId?: string | null;
  reason: string;
  startedAt: string | Date;
  expiresAt: string | Date;
  endedAt?: string | Date | null;
  actionsCount: number;
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
  initialProviders,
  initialSection = "readiness",
}: {
  initialOrgs: PlatformOrganization[];
  initialFlags: PlatformAbuseFlag[];
  initialProviders?: Record<string, ProviderDiagnostics> | undefined;
  initialSection?: string;
}) {
  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userSearchRows, setUserSearchRows] = useState<PlatformUserRow[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<PlatformUserDetail | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<PlatformOrganization | null>(
    null,
  );
  const [userDetailBusyId, setUserDetailBusyId] = useState<string | null>(null);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [paymentSearchRows, setPaymentSearchRows] = useState<PlatformPaymentRow[] | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PlatformPaymentDetail | null>(null);
  const [paymentDetailBusyId, setPaymentDetailBusyId] = useState<string | null>(null);
  const [supportNotice, setSupportNotice] = useState("");
  const [broadcastBusyId, setBroadcastBusyId] = useState<string | null>(null);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const activeSection = initialSection;
  const showReadiness = activeSection === "readiness";
  const showIncidentChecklist = activeSection === "incident-checklist";
  const needsStatusData = showReadiness || showIncidentChecklist;
  const showUsers = activeSection === "users";
  const showPayments = activeSection === "payments";
  const showBroadcasts = activeSection === "broadcasts";
  const showModeration = activeSection === "moderation";
  const showImpersonations = activeSection === "impersonations";
  const showFeatureFlags = activeSection === "feature-flags";
  const showWebhooks = activeSection === "webhooks";
  const showAudit = activeSection === "audit";
  const showOrganizations = activeSection === "organizations";
  const showSubscriptions = activeSection === "subscriptions";
  const showAssistant = activeSection === "ai-traffic";
  const showSafety = activeSection === "abuse-flags";

  const organizationsState = useOperationalResource<{ orgs: PlatformOrganization[] }>({
    path: "/api/platform/orgs",
    initialData: { orgs: initialOrgs },
    enabled: showOrganizations,
  });
  const providersState = useOperationalResource<{ providers: Record<string, ProviderDiagnostics> }>(
    {
      path: "/api/platform/provider-status",
      initialData: initialProviders ? { providers: initialProviders } : undefined,
      enabled: needsStatusData,
    },
  );
  const usageState = useOperationalResource<{ usage: PlatformUsageRow[] }>({
    path: "/api/platform/ai-usage",
    enabled: showAssistant,
  });
  const flagsState = useOperationalResource<{ flags: PlatformAbuseFlag[] }>({
    path: "/api/platform/abuse-flags",
    initialData: { flags: initialFlags },
    enabled: showSafety,
  });
  const featureFlagsState = useOperationalResource<{ flags: PlatformFlagRow[] }>({
    path: "/api/platform/flags",
    enabled: showFeatureFlags,
  });
  const webhooksState = useOperationalResource<{ attempts: PlatformWebhookAttempt[] }>({
    path: "/api/platform/webhooks",
    enabled: showWebhooks,
  });
  const auditState = useOperationalResource<{ auditLogs: PlatformAuditRow[] }>({
    path: "/api/platform/audit",
    enabled: showAudit,
  });
  const broadcastsState = useOperationalResource<{ broadcasts: PlatformBroadcastRow[] }>({
    path: "/api/platform/broadcasts",
    enabled: showBroadcasts,
  });
  const moderationState = useOperationalResource<{ flags: PlatformModerationRow[] }>({
    path: "/api/platform/moderation",
    enabled: showModeration,
  });
  const impersonationsState = useOperationalResource<{ impersonations: PlatformImpersonationRow[] }>(
    {
      path: "/api/platform/impersonations",
      enabled: showImpersonations,
    },
  );
  const usersState = useOperationalResource<{ users: PlatformUserRow[] }>({
    path: "/api/platform/users",
    enabled: showUsers,
  });
  const paymentsState = useOperationalResource<{ payments: PlatformPaymentRow[] }>({
    path: "/api/platform/payments",
    enabled: showPayments,
  });

  const organizations = organizationsState.data?.orgs ?? initialOrgs;
  const providers = providersState.data?.providers;
  const providerEntries = useMemo(() => Object.entries(providers ?? {}), [providers]);
  const usage = usageState.data?.usage ?? [];
  const flags = flagsState.data?.flags ?? initialFlags;
  const featureFlags = featureFlagsState.data?.flags ?? [];
  const webhooks = webhooksState.data?.attempts ?? [];
  const auditLogs = auditState.data?.auditLogs ?? [];
  const broadcasts = broadcastsState.data?.broadcasts ?? [];
  const moderationFlags = moderationState.data?.flags ?? [];
  const impersonations = impersonationsState.data?.impersonations ?? [];
  const userRows = userSearchRows ?? usersState.data?.users ?? [];
  const paymentRows = paymentSearchRows ?? paymentsState.data?.payments ?? [];

  const misconfiguredProviders = useMemo(
    () =>
      providerEntries.filter(
        ([, provider]) => provider.status === "misconfigured" || provider.status === "unsupported",
      ),
    [providerEntries],
  );
  const readyProviders = useMemo(
    () => providerEntries.filter(([, provider]) => provider.status === "ready"),
    [providerEntries],
  );
  const defaultProviders = useMemo(
    () => providerEntries.filter(([, provider]) => provider.status === "default"),
    [providerEntries],
  );
  const suspendedOrganizations = useMemo(
    () => organizations.filter((org) => org.status === "SUSPENDED"),
    [organizations],
  );
  const openFlags = useMemo(
    () => flags.filter((flag) => !flag.resolvedAt && flag.status.toLowerCase() !== "resolved"),
    [flags],
  );
  const trialRiskOrganizations = useMemo(
    () =>
      organizations.filter((org) => {
        const trialEndAt = new Date(org.trialEndAt).getTime();
        if (!Number.isFinite(trialEndAt) || org.status !== "ACTIVE") return false;
        const daysLeft = Math.ceil((trialEndAt - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 7;
      }),
    [organizations],
  );
  const cockpitItems = useMemo(() => [
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
  ], [misconfiguredProviders.length, openFlags.length, organizations, readyProviders.length, trialRiskOrganizations.length]);
  const incidentChecklist = useMemo(() => [
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
  ], [misconfiguredProviders, openFlags.length, suspendedOrganizations.length, trialRiskOrganizations.length]);

  async function updateOrganizationStatus(
    org: PlatformOrganization,
    status: "ACTIVE" | "SUSPENDED" | "CANCELLED",
  ) {
    const expected = `${status} ${org.username}`;
    if (!typedConfirmation(`Change ${org.name} to ${formatEnumLabel(status)}?`, expected)) {
      return;
    }
    try {
      setStatusError("");
      setBusyOrgId(org.id);
      await webApiFetch(`/api/platform/orgs/${org.id}/status`, {
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

  async function softDeleteOrganization(org: PlatformOrganization) {
    if (!typedConfirmation(`Soft-delete ${org.name}? This keeps an audit trail but removes normal access.`, `DELETE ${org.username}`)) {
      return;
    }
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    try {
      setStatusError("");
      setBusyOrgId(org.id);
      await webApiFetch(`/api/platform/orgs/${org.id}/soft-delete`, {
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

  async function extendOrganizationTrial(orgId: string) {
    const days = Number(window.prompt("Days to extend")?.trim());
    if (!Number.isInteger(days) || days < 1) return;
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await runOrgAction(orgId, `/api/platform/orgs/${orgId}/trial/extend`, "POST", {
      days,
      reason,
    });
  }

  async function adjustOrganizationCredit(orgId: string) {
    const rupees = Number(window.prompt("Credit adjustment in rupees. Use negative for debit.")?.trim());
    if (!Number.isFinite(rupees) || rupees === 0) return;
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await runOrgAction(orgId, `/api/platform/orgs/${orgId}/credit`, "POST", {
      paise: Math.round(rupees * 100),
      reason,
    });
  }

  async function changeOrganizationTier(orgId: string) {
    const tier = window.prompt("Tier: FREE, STARTER, GROWTH, PRO")?.trim().toUpperCase();
    if (!tier || !["FREE", "STARTER", "GROWTH", "PRO"].includes(tier)) return;
    await runOrgAction(orgId, `/api/platform/orgs/${orgId}/tier`, "PATCH", { tier });
  }

  async function renameOrganization(org: PlatformOrganization) {
    const name = window.prompt("New organization name", org.name)?.trim();
    if (!name) return;
    const username = window.prompt("New username", org.username)?.trim();
    if (!username) return;
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await runOrgAction(org.id, `/api/platform/orgs/${org.id}/rename`, "POST", {
      name,
      username,
      reason,
    });
  }

  async function transferOrganizationOwnership(orgId: string) {
    const newOwnerUserId = window.prompt("New owner user ID")?.trim();
    if (!newOwnerUserId) return;
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await runOrgAction(orgId, `/api/platform/orgs/${orgId}/transfer-ownership`, "POST", {
      newOwnerUserId,
      reason,
    });
  }

  async function bulkImportOrganizationMembers(orgId: string) {
    const csv = window.prompt("CSV with name,email header")?.trim();
    if (!csv) return;
    await runOrgAction(orgId, `/api/platform/orgs/${orgId}/bulk-import-members`, "POST", {
      csv,
    });
  }

  async function runOrgAction(
    orgId: string,
    path: string,
    method: "POST" | "PATCH",
    body: Record<string, unknown>,
  ) {
    try {
      setStatusError("");
      setBusyOrgId(orgId);
      await webApiFetch(path, { method, body });
      setSupportNotice("Organization updated");
      organizationsState.reload();
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Unable to update organization.",
      );
    } finally {
      setBusyOrgId(null);
    }
  }

  async function searchUsers() {
    const query = userQuery.trim();
    if (!query) {
      setUserSearchRows(null);
      return;
    }
    const response = await webApiFetch<{ users: PlatformUserRow[] }>(
      `/api/platform/users?q=${encodeURIComponent(query)}`,
    );
    setUserSearchRows(response.users);
  }

  async function loadUserDetails(userId: string) {
    try {
      setUserDetailBusyId(userId);
      const response = await webApiFetch<PlatformUserDetail>(`/api/platform/users/${userId}`);
      setSelectedUser(response);
    } finally {
      setUserDetailBusyId(null);
    }
  }

  async function revokeUserSessions(userId: string) {
    await webApiFetch(`/api/platform/users/${userId}/sessions/revoke`, { method: "POST", body: {} });
    setSupportNotice("Sessions revoked");
  }

  async function startImpersonation(userId: string) {
    if (!typedConfirmation("Start a 15-minute impersonation session? Use only for support debugging.", "IMPERSONATE")) {
      return;
    }
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    await webApiFetch(`/api/platform/users/${userId}/impersonate`, {
      method: "POST",
      body: { reason, ttlMinutes: 15 },
    });
    setSupportNotice("Impersonation started");
  }

  async function searchPayments() {
    const query = paymentQuery.trim();
    if (!query) {
      setPaymentSearchRows(null);
      return;
    }
    const response = await webApiFetch<{ payments: PlatformPaymentRow[] }>(
      `/api/platform/payments?q=${encodeURIComponent(query)}`,
    );
    setPaymentSearchRows(response.payments);
  }

  async function loadPaymentDetails(paymentId: string) {
    try {
      setPaymentDetailBusyId(paymentId);
      const response = await webApiFetch<PlatformPaymentDetail>(`/api/platform/payments/${paymentId}`);
      setSelectedPayment(response);
    } finally {
      setPaymentDetailBusyId(null);
    }
  }

  async function refundPayment(paymentId: string) {
    if (!typedConfirmation("Submit a refund for this payment?", "REFUND")) {
      return;
    }
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

  async function createBroadcast() {
    const title = window.prompt("Broadcast title")?.trim();
    if (!title) return;
    const body = window.prompt("Broadcast body")?.trim();
    if (!body) return;
    const severity =
      window.prompt("Severity: INFO, WARN, CRITICAL", "INFO")?.trim().toUpperCase() || "INFO";
    const status =
      window.prompt("Status: DRAFT, SCHEDULED, LIVE", "DRAFT")?.trim().toUpperCase() || "DRAFT";
    await webApiFetch("/api/platform/broadcasts", {
      method: "POST",
      body: {
        title,
        body,
        severity: ["INFO", "WARN", "CRITICAL"].includes(severity) ? severity : "INFO",
        status: ["DRAFT", "SCHEDULED", "LIVE"].includes(status) ? status : "DRAFT",
        targetOrgIds: [],
        targetRoles: [],
      },
    });
    setSupportNotice("Broadcast saved");
    broadcastsState.reload();
  }

  async function updateBroadcastStatus(broadcast: PlatformBroadcastRow, status: "DRAFT" | "LIVE" | "EXPIRED") {
    try {
      setBroadcastBusyId(broadcast.id);
      await webApiFetch(`/api/platform/broadcasts/${broadcast.id}`, {
        method: "PATCH",
        body: { status },
      });
      setSupportNotice(status === "LIVE" ? "Broadcast published" : "Broadcast updated");
      broadcastsState.reload();
    } finally {
      setBroadcastBusyId(null);
    }
  }

  async function deleteBroadcast(broadcastId: string) {
    try {
      setBroadcastBusyId(broadcastId);
      await webApiFetch(`/api/platform/broadcasts/${broadcastId}`, { method: "DELETE" });
      setSupportNotice("Broadcast deleted");
      broadcastsState.reload();
    } catch (cause) {
      setSupportNotice(cause instanceof Error ? cause.message : "Unable to delete broadcast");
    } finally {
      setBroadcastBusyId(null);
    }
  }

  async function decideModeration(flagId: string, decision: "APPROVED" | "REMOVED") {
    const reason = window.prompt("Reason")?.trim();
    if (!reason) return;
    try {
      setModerationBusyId(flagId);
      await webApiFetch("/api/platform/moderation", {
        method: "POST",
        body: { id: flagId, decision, reason },
      });
      setSupportNotice("Moderation decision saved");
      moderationState.reload();
    } finally {
      setModerationBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {showReadiness ? (
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
              tone: misconfiguredProviders.length ? "amber" : "neutral",
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
              tone: openFlags.length ? "amber" : "neutral",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[22px] border border-white/10 bg-black/20 p-4"
            >
              <StatusPill value={item.title} tone={item.tone as "amber" | "blue" | "neutral"} />
              <p className="mt-3 text-sm leading-6 text-white/58">{item.body}</p>
            </div>
          ))}
        </div>
      </GlassCard>
      ) : null}

      {showUsers || showPayments ? (
      <div id="support-console" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Support"
            title="Platform support console"
            description="Recent users and payments are loaded by default. Search narrows the list, and Details opens the full operational record."
            badge={supportNotice ? <Pill tone="lime">{supportNotice}</Pill> : <Pill>Live</Pill>}
          />
          <div className={`mt-5 grid gap-4 ${showUsers && showPayments ? "xl:grid-cols-2" : ""}`}>
            {showUsers ? (
            <div id="users" className="scroll-mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <SectionHeader
                eyebrow="Users"
                title="User search and details"
                description="Find members, staff, owners, and seeded test accounts across the platform."
                badge={
                  <Pill tone={usersState.loading ? "amber" : "neutral"}>
                    {usersState.loading && !userRows.length ? "Loading" : `${userRows.length} visible`}
                  </Pill>
                }
              />
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
                          {user.phone ? <p className="mt-1 text-xs text-white/45">{user.phone}</p> : null}
                        </div>
                      ),
                    },
                    {
                      id: "kind",
                      header: "Kind",
                      render: (user) => (
                        <StatusPill
                          value={user.isPlatformAdmin ? "Platform admin" : "User"}
                          tone={user.isPlatformAdmin ? "amber" : "blue"}
                        />
                      ),
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      align: "right",
                      render: (user) => (
                        <div className="flex flex-wrap justify-end gap-2">
                          <ZookButton
                            size="sm"
                            tone="ghost"
                            disabled={userDetailBusyId === user.id}
                            onClick={() => void loadUserDetails(user.id)}
                          >
                            Details
                          </ZookButton>
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
                  empty={usersState.error || "No users match this search."}
                />
              </div>
              {selectedUser ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                        User details
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{selectedUser.user.name}</h3>
                      <p className="mt-1 text-sm text-white/55">{selectedUser.user.email}</p>
                      {selectedUser.user.phone ? (
                        <p className="mt-1 text-sm text-white/45">{selectedUser.user.phone}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/8 hover:text-white"
                      onClick={() => setSelectedUser(null)}
                    >
                      Close
                    </button>
                  </div>
                  <ReadoutGrid
                    className="mt-4"
                    columns={3}
                    items={[
                      {
                        label: "Organizations",
                        value: formatCompactNumber(selectedUser.organizations.length),
                        meta: "Active and historical links",
                      },
                      {
                        label: "Payments",
                        value: formatCompactNumber(selectedUser.payments.length),
                        meta: "Recent payment records",
                      },
                      {
                        label: "Sessions",
                        value: formatCompactNumber(selectedUser.sessions.length),
                        meta: "Recent auth sessions",
                      },
                    ]}
                  />
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Gym access
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedUser.organizations.length ? (
                          selectedUser.organizations.slice(0, 6).map((membership) => (
                            <div key={membership.orgId} className="rounded-2xl bg-white/[0.04] p-3">
                              <p className="font-medium text-white">
                                {membership.organization?.name ?? membership.orgId}
                              </p>
                              <p className="mt-1 text-xs text-white/45">
                                {membership.roles.map(formatEnumLabel).join(", ") || "No roles"} ·{" "}
                                {formatEnumLabel(membership.status)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No gym access found.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Recent payments
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedUser.payments.length ? (
                          selectedUser.payments.slice(0, 6).map((payment) => (
                            <button
                              type="button"
                              key={payment.id}
                              className="zook-focus rounded-2xl bg-white/[0.04] p-3 text-left"
                              onClick={() => void loadPaymentDetails(payment.id)}
                            >
                              <p className="font-medium text-white">{formatInr(payment.amountPaise)}</p>
                              <p className="mt-1 text-xs text-white/45">
                                {formatEnumLabel(payment.status)} · {formatDateTime(payment.createdAt)}
                              </p>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No payments found for this user.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            ) : null}

            {showPayments ? (
            <div id="payments" className="scroll-mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <SectionHeader
                eyebrow="Payments"
                title="Payment ledger"
                description="Test and live payment records appear here immediately after checkout or desk payment creation."
                badge={
                  <Pill tone={paymentsState.loading ? "amber" : "neutral"}>
                    {paymentsState.loading && !paymentRows.length
                      ? "Loading"
                      : `${paymentRows.length} visible`}
                  </Pill>
                }
              />
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
                          <p className="mt-1 text-xs text-white/45">
                            {payment.providerRef ?? payment.provider ?? "Manual entry"}
                          </p>
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
                        <div className="flex flex-wrap justify-end gap-2">
                          <ZookButton
                            size="sm"
                            tone="ghost"
                            disabled={paymentDetailBusyId === payment.id}
                            onClick={() => void loadPaymentDetails(payment.id)}
                          >
                            Details
                          </ZookButton>
                          <ZookButton size="sm" tone="ghost" onClick={() => void refundPayment(payment.id)}>
                            Refund
                          </ZookButton>
                        </div>
                      ),
                    },
                  ]}
                  rows={paymentRows}
                  rowKey={(payment) => payment.id}
                  empty={paymentsState.error || "No payments match this search."}
                />
              </div>
              {selectedPayment ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                        Payment details
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-white">
                        {formatInr(selectedPayment.payment.amountPaise)}
                      </h3>
                      <p className="mt-1 text-sm text-white/55">{selectedPayment.payment.id}</p>
                    </div>
                    <button
                      type="button"
                      className="zook-focus rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:bg-white/8 hover:text-white"
                      onClick={() => setSelectedPayment(null)}
                    >
                      Close
                    </button>
                  </div>
                  <ReadoutGrid
                    className="mt-4"
                    columns={3}
                    items={[
                      {
                        label: "Status",
                        value: formatEnumLabel(selectedPayment.payment.status),
                        meta: selectedPayment.payment.provider ?? "Manual entry",
                      },
                      {
                        label: "Refunds",
                        value: formatCompactNumber(selectedPayment.refunds.length),
                        meta: selectedPayment.refunds.length
                          ? `${formatInr(
                              selectedPayment.refunds.reduce((sum, refund) => sum + refund.amountPaise, 0),
                            )} total`
                          : "No refund records",
                      },
                      {
                        label: "Events",
                        value: formatCompactNumber(selectedPayment.events.length),
                        meta: "Provider and test events",
                      },
                    ]}
                  />
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Context
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-white/60">
                        <p>
                          Gym:{" "}
                          <span className="text-white">
                            {selectedPayment.organization?.name ?? selectedPayment.payment.orgId ?? "None"}
                          </span>
                        </p>
                        <p>
                          User:{" "}
                          <span className="text-white">
                            {selectedPayment.user?.email ?? selectedPayment.payment.userId ?? "None"}
                          </span>
                        </p>
                        <p>
                          Created:{" "}
                          <span className="text-white">{formatDateTime(selectedPayment.payment.createdAt)}</span>
                        </p>
                        {selectedPayment.payment.receiptNumber ? (
                          <p>
                            Receipt: <span className="text-white">{selectedPayment.payment.receiptNumber}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                        Events
                      </p>
                      <div className="mt-3 grid gap-2">
                        {selectedPayment.events.length ? (
                          selectedPayment.events.slice(0, 6).map((event) => (
                            <div key={event.id} className="rounded-2xl bg-white/[0.04] p-3">
                              <p className="font-medium text-white">
                                {formatEnumLabel(event.type ?? event.status ?? "event")}
                              </p>
                              <p className="mt-1 text-xs text-white/45">
                                {event.providerEventId ?? event.id} · {formatDateTime(event.createdAt)}
                              </p>
                              {event.processingError ? (
                                <p className="mt-1 text-xs text-red-100">{event.processingError}</p>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-white/45">No payment events recorded yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            ) : null}
          </div>
        </GlassCard>
      </div>
      ) : null}

      {showBroadcasts || showModeration ? (
      <div className={`grid gap-4 ${showBroadcasts && showModeration ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
        {showBroadcasts ? (
        <div id="broadcasts" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Broadcasts"
              title="Platform broadcasts"
              description="Create operational notices and publish them to active gyms."
              badge={<Pill>{broadcasts.length} loaded</Pill>}
              action={
                <ZookButton size="sm" onClick={() => void createBroadcast()}>
                  New broadcast
                </ZookButton>
              }
            />
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    id: "title",
                    header: "Broadcast",
                    render: (broadcast) => (
                      <div>
                        <p className="font-medium text-white">{broadcast.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-white/45">{broadcast.body}</p>
                      </div>
                    ),
                  },
                  {
                    id: "severity",
                    header: "Severity",
                    render: (broadcast) => <StatusPill value={formatEnumLabel(broadcast.severity)} />,
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (broadcast) => <StatusPill value={formatEnumLabel(broadcast.status)} />,
                  },
                  {
                    id: "created",
                    header: "Created",
                    render: (broadcast) => formatDateTime(broadcast.createdAt),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "right",
                    render: (broadcast) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={broadcastBusyId === broadcast.id || broadcast.status === "LIVE"}
                          onClick={() => void updateBroadcastStatus(broadcast, "LIVE")}
                        >
                          Publish
                        </ZookButton>
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={broadcastBusyId === broadcast.id || broadcast.status === "EXPIRED"}
                          onClick={() => void updateBroadcastStatus(broadcast, "EXPIRED")}
                        >
                          Expire
                        </ZookButton>
                        <ConfirmActionButton
                          className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={broadcastBusyId === broadcast.id}
                          title="Delete this broadcast?"
                          description="This removes the platform broadcast from the support console. Published recipients may already have seen it."
                          confirmLabel="Delete"
                          confirmTone="danger"
                          onConfirm={() => deleteBroadcast(broadcast.id)}
                        >
                          Delete
                        </ConfirmActionButton>
                      </div>
                    ),
                  },
                ]}
                rows={broadcasts}
                rowKey={(broadcast) => broadcast.id}
                empty="No broadcasts yet."
              />
            </div>
          </GlassCard>
        </div>
        ) : null}

        {showModeration ? (
        <div id="moderation" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Moderation"
              title="Content moderation queue"
              description="Review flagged content and record a platform decision."
              badge={<Pill tone={moderationFlags.some((flag) => flag.status === "PENDING") ? "amber" : "lime"}>{moderationFlags.length} flags</Pill>}
            />
            <div className="mt-5">
              <DataTable
                columns={[
                  {
                    id: "flag",
                    header: "Flag",
                    render: (flag) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(flag.kind)}</p>
                        <p className="mt-1 text-xs text-white/45">{flag.targetId ?? flag.orgId}</p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (flag) => <StatusPill value={formatEnumLabel(flag.status)} />,
                  },
                  {
                    id: "created",
                    header: "Created",
                    render: (flag) => formatDateTime(flag.createdAt),
                  },
                  {
                    id: "actions",
                    header: "Actions",
                    align: "right",
                    render: (flag) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        <ZookButton
                          size="sm"
                          tone="ghost"
                          disabled={moderationBusyId === flag.id || flag.status !== "PENDING"}
                          onClick={() => void decideModeration(flag.id, "APPROVED")}
                        >
                          Approve
                        </ZookButton>
                        <ZookButton
                          size="sm"
                          tone="danger"
                          disabled={moderationBusyId === flag.id || flag.status !== "PENDING"}
                          onClick={() => void decideModeration(flag.id, "REMOVED")}
                        >
                          Remove
                        </ZookButton>
                      </div>
                    ),
                  },
                ]}
                rows={moderationFlags}
                rowKey={(flag) => flag.id}
                empty="No moderation flags."
              />
            </div>
          </GlassCard>
        </div>
        ) : null}
      </div>
      ) : null}

      {showImpersonations ? (
      <div id="impersonations" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Impersonations"
            title="Support impersonation history"
            description="Recent audited sessions started by platform support."
            badge={<Pill>{impersonations.length} sessions</Pill>}
          />
          <div className="mt-5">
            <DataTable
              columns={[
                {
                  id: "target",
                  header: "Target",
                  render: (session) => (
                    <div>
                      <p className="font-medium text-white">{session.targetUserId}</p>
                      <p className="mt-1 text-xs text-white/45">{session.targetOrgId ?? "No org scope"}</p>
                    </div>
                  ),
                },
                {
                  id: "reason",
                  header: "Reason",
                  render: (session) => session.reason,
                },
                {
                  id: "started",
                  header: "Started",
                  render: (session) => formatDateTime(session.startedAt),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (session) => (
                    <StatusPill
                      value={session.endedAt ? "Ended" : new Date(session.expiresAt).getTime() < Date.now() ? "Expired" : "Active"}
                      tone={session.endedAt ? "blue" : new Date(session.expiresAt).getTime() < Date.now() ? "amber" : "lime"}
                    />
                  ),
                },
              ]}
              rows={impersonations}
              rowKey={(session) => session.id}
              empty="No impersonation sessions."
            />
          </div>
        </GlassCard>
      </div>
      ) : null}

      {showFeatureFlags || showWebhooks || showAudit ? (
      <div
        className={`grid gap-4 ${
          [showFeatureFlags, showWebhooks, showAudit].filter(Boolean).length > 1 ? "xl:grid-cols-3" : ""
        }`}
      >
        {showFeatureFlags ? (
        <GlassCard id="feature-flags">
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
        ) : null}

        {showWebhooks ? (
        <GlassCard id="webhooks">
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
        ) : null}

        {showAudit ? (
        <GlassCard id="audit">
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
        ) : null}
      </div>
      ) : null}

      {showReadiness ? (
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
              empty="No service status checks to show."
            />
          </div>
        </GlassCard>
      </div>
      ) : null}

      {showIncidentChecklist ? (
      <div id="incident-checklist" className="scroll-mt-5">
        <GlassCard>
          <SectionHeader
            eyebrow="Incident mode"
            title="Production incident checklist"
            description="A simple first-response lane for provider outages, payment trouble, safety escalations, and tenant-impacting issues."
            badge={<Pill>Use during live support</Pill>}
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
      ) : null}

      {showOrganizations ? (
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
                        <ZookButton
                          tone="ghost"
                          size="sm"
                          onClick={() => setSelectedOrganization(org)}
                        >
                          Details
                        </ZookButton>
                        {org.status !== "ACTIVE" ? (
                          <ZookButton
                            tone="ghost"
                            size="sm"
                            onClick={() => void updateOrganizationStatus(org, "ACTIVE")}
                            disabled={busyOrgId === org.id}
                          >
                            Activate
                          </ZookButton>
                        ) : (
                          <ZookButton
                            tone="ghost"
                            size="sm"
                            onClick={() => void updateOrganizationStatus(org, "SUSPENDED")}
                            disabled={busyOrgId === org.id}
                          >
                            Suspend
                          </ZookButton>
                        )}
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
            {selectedOrganization ? (
              <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
                      Organization details
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {selectedOrganization.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/55">@{selectedOrganization.username}</p>
                  </div>
                  <ZookButton
                    tone="ghost"
                    size="sm"
                    onClick={() => setSelectedOrganization(null)}
                  >
                    Close
                  </ZookButton>
                </div>
                <ReadoutGrid
                  className="mt-4"
                  columns={3}
                  items={[
                    {
                      label: "Status",
                      value: formatEnumLabel(selectedOrganization.status),
                      meta: "Current platform state",
                    },
                    {
                      label: "Join mode",
                      value: formatEnumLabel(selectedOrganization.joinMode),
                      meta: "How members enter the gym",
                    },
                    {
                      label: "Trial end",
                      value: formatDate(selectedOrganization.trialEndAt),
                      meta: trialRiskOrganizations.some((org) => org.id === selectedOrganization.id)
                        ? "Needs renewal follow-up"
                        : "No immediate trial risk",
                    },
                    {
                      label: "Location",
                      value: `${selectedOrganization.city}${
                        selectedOrganization.state ? `, ${selectedOrganization.state}` : ""
                      }`,
                      meta: "Primary market",
                    },
                    {
                      label: "Contact",
                      value:
                        selectedOrganization.contactEmail ??
                        selectedOrganization.contactPhone ??
                        "Not captured",
                      meta: "Support handoff",
                    },
                    {
                      label: "Created",
                      value: formatDate(selectedOrganization.createdAt),
                      meta: openFlags.some((flag) => flag.orgId === selectedOrganization.id)
                        ? "Has open safety review"
                        : "No open safety review",
                    },
                  ]}
                />
                <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    Advanced actions
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["ACTIVE", "SUSPENDED", "CANCELLED"] as const).map((nextStatus) => (
                      <ZookButton
                        key={nextStatus}
                        tone={nextStatus === "CANCELLED" ? "danger" : "ghost"}
                        size="sm"
                        onClick={() => void updateOrganizationStatus(selectedOrganization, nextStatus)}
                        disabled={busyOrgId === selectedOrganization.id || selectedOrganization.status === nextStatus}
                      >
                        {nextStatus === "ACTIVE"
                          ? "Activate"
                          : nextStatus === "SUSPENDED"
                            ? "Suspend"
                            : "Cancel"}
                      </ZookButton>
                    ))}
                    <ZookButton
                      tone="ghost"
                      size="sm"
                      onClick={() => void extendOrganizationTrial(selectedOrganization.id)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Extend trial
                    </ZookButton>
                    <ZookButton
                      tone="ghost"
                      size="sm"
                      onClick={() => void adjustOrganizationCredit(selectedOrganization.id)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Credit
                    </ZookButton>
                    <ZookButton
                      tone="ghost"
                      size="sm"
                      onClick={() => void changeOrganizationTier(selectedOrganization.id)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Tier
                    </ZookButton>
                    <ZookButton
                      tone="ghost"
                      size="sm"
                      onClick={() => void renameOrganization(selectedOrganization)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Rename
                    </ZookButton>
                    <ZookButton
                      tone="ghost"
                      size="sm"
                      onClick={() => void bulkImportOrganizationMembers(selectedOrganization.id)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Import CSV
                    </ZookButton>
                    <ZookButton
                      tone="danger"
                      size="sm"
                      onClick={() => void transferOrganizationOwnership(selectedOrganization.id)}
                      disabled={busyOrgId === selectedOrganization.id}
                    >
                      Transfer owner
                    </ZookButton>
                    <ZookButton
                      tone="danger"
                      size="sm"
                      onClick={() => void softDeleteOrganization(selectedOrganization)}
                      disabled={busyOrgId === selectedOrganization.id || selectedOrganization.status === "DELETED"}
                    >
                      Soft delete
                    </ZookButton>
                  </div>
                </div>
              </div>
            ) : null}
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
      ) : null}

      {showAssistant || showSubscriptions || showSafety ? (
      <div
        className={`grid gap-4 ${
          [showAssistant, showSubscriptions, showSafety].filter(Boolean).length > 1
            ? "xl:grid-cols-[1.05fr_0.95fr]"
            : ""
        }`}
      >
        {showAssistant ? (
        <div id="ai-traffic" className="scroll-mt-5">
          <GlassCard>
            <SectionHeader
              eyebrow="Assistant"
              title="Recent assistant activity"
              description="A quick view of assisted drafts across gyms."
              badge={<Pill>{usage.length} events</Pill>}
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
        ) : null}

        {showSubscriptions ? <PlatformSubscriptionsSection /> : null}

        {showSafety ? (
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
        ) : null}
      </div>
      ) : null}
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
  tier?: string | null;
  billingCycle?: string | null;
  priceLockedPaise?: number | null;
  creditPaise?: number | null;
  noteForPlatform?: string | null;
  nextBillingAt: string | Date | null;
  mandateStatus: string | null;
  mandateNextChargeAt: string | Date | null;
  mandatePaidCount: number;
  referredCount: number;
  usage?: {
    activeMemberCount?: number;
    branchCount?: number;
    staffCount?: number;
    trainerCount?: number;
    productCount?: number;
  };
  entitlements?: {
    memberLimit?: number | null;
    branchLimit?: number | null;
    staffLimit?: number | null;
    trainerLimit?: number | null;
    productLimit?: number | null;
    notificationMonthlyLimit?: number | null;
    aiTextMonthlyLimit?: number | null;
    aiImageMonthlyLimit?: number | null;
    reports?: string;
    support?: string;
    referrals?: string;
  };
};

type PlatformPlanCatalog = Record<
  string,
  {
    name: string;
    monthly: number;
    yearly: number;
    entitlements: NonNullable<SubscriptionRow["entitlements"]>;
  }
>;

function PlatformSubscriptionsSection() {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [planCatalog, setPlanCatalog] = useState<PlatformPlanCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const limitFormatOptions = { compact: true, unlimitedLabel: "unlimited" };

  useEffect(() => {
    let mounted = true;
    webApiFetch<{ summary: SubscriptionSummary; rows: SubscriptionRow[]; planCatalog?: PlatformPlanCatalog }>(
      "/api/platform/subscriptions",
    )
      .then((payload) => {
        if (!mounted) return;
        setSummary(payload.summary);
        setRows(payload.rows);
        setPlanCatalog(payload.planCatalog ?? null);
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
          {planCatalog ? (
            <div className="mb-5 grid gap-3 lg:grid-cols-3">
              {(["STARTER", "GROWTH", "PRO"] as const).map((tier) => {
                const plan = planCatalog[tier];
                if (!plan) return null;
                return (
                  <div key={tier} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{plan.name ?? formatEnumLabel(tier)}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatInr(plan.monthly)} / mo · {formatInr(plan.yearly)} / yr
                        </p>
                      </div>
                      <StatusPill value={tier} tone={tier === "PRO" ? "lime" : "blue"} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/52">
                      {formatUsageLimit(plan.entitlements.memberLimit, limitFormatOptions)} members ·{" "}
                      {formatUsageLimit(plan.entitlements.branchLimit, limitFormatOptions)} branches ·{" "}
                      {formatUsageLimit(plan.entitlements.staffLimit, limitFormatOptions)} staff ·{" "}
                      {formatUsageLimit(plan.entitlements.productLimit, limitFormatOptions)} products
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/42">
                      {formatUsageLimit(plan.entitlements.notificationMonthlyLimit, limitFormatOptions)} message recipients/mo ·{" "}
                      {formatUsageLimit(plan.entitlements.aiTextMonthlyLimit, limitFormatOptions)} AI text/mo ·{" "}
                      {formatEnumLabel(plan.entitlements.support ?? "standard")} support
                    </p>
                  </div>
                );
              })}
            </div>
          ) : null}
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
                        <p className="mt-1 text-xs text-white/45">
                          {formatEnumLabel(row.tier ?? "FREE")} · {formatEnumLabel(row.billingCycle ?? "MONTHLY")}
                          {row.creditPaise ? ` · ${formatInr(row.creditPaise)} credit` : ""}
                        </p>
                        {row.noteForPlatform ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-white/45">
                            Note: {row.noteForPlatform}
                          </p>
                        ) : null}
                        {row.usage ? (
                          <p className="mt-1 text-xs text-white/45">
                            {formatCompactNumber(row.usage.activeMemberCount ?? 0)} /{" "}
                            {formatUsageLimit(row.entitlements?.memberLimit, limitFormatOptions)} members ·{" "}
                            {formatCompactNumber(row.usage.branchCount ?? 0)} /{" "}
                            {formatUsageLimit(row.entitlements?.branchLimit, limitFormatOptions)} branches
                          </p>
                        ) : null}
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
                      <Pill>{row.referredCount}</Pill>
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
