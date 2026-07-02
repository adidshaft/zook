"use client";

import { useMemo, useState } from "react";
import { type PillTone } from "./glass-card";
import {
  PlatformContentSections,
  type PlatformBroadcastRow,
  type PlatformModerationRow,
} from "./platform/content-sections";
import { PlatformHealthCockpit } from "./platform/health-cockpit";
import { PlatformImpersonationsSection } from "./platform/impersonations-section";
import { PlatformOpsSections } from "./platform/ops-sections";
import {
  PlatformOperationDialogs,
  previewMemberCsv,
  type BroadcastComposeDialog,
  type ModerationDecisionDialog,
  type OrganizationActionDialog,
  type OrganizationActionKind,
  type OrganizationStatusDialog,
  type SupportActionDialog,
} from "./platform/operation-dialogs";
import { PlatformOrganizationsSection } from "./platform/organizations-section";
import { PlatformReadinessSections } from "./platform/readiness-sections";
import { PlatformAssistantSection, PlatformSafetySection } from "./platform/signals-sections";
import { PlatformSubscriptionsSection } from "./platform/subscriptions-section";
import { PlatformSupportConsoleSection } from "./platform/support-console-section";
import {
  formatCompactNumber,
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
  createdAt?: string | Date;
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
  initialSection = "business-overview",
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
  const [supportNotice, setSupportNoticeState] = useState<{
    message: string;
    tone: PillTone;
  } | null>(null);
  const [organizationActionDialog, setOrganizationActionDialog] =
    useState<OrganizationActionDialog | null>(null);
  const [organizationStatusDialog, setOrganizationStatusDialog] =
    useState<OrganizationStatusDialog | null>(null);
  const [broadcastComposeDialog, setBroadcastComposeDialog] =
    useState<BroadcastComposeDialog | null>(null);
  const [supportActionDialog, setSupportActionDialog] = useState<SupportActionDialog | null>(null);
  const [moderationDecisionDialog, setModerationDecisionDialog] =
    useState<ModerationDecisionDialog | null>(null);
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
  const showSubscriptions =
    activeSection === "business-overview" ||
    activeSection === "subscriptions" ||
    activeSection === "referrals";
  const showAssistant = activeSection === "ai-traffic";
  const showSafety = activeSection === "abuse-flags";

  function setSupportNotice(message: string, tone: PillTone = "blue") {
    setSupportNoticeState({ message, tone });
  }

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
      label: "Active services",
      value: formatCompactNumber(readyProviders.length),
      meta: "Configured member services",
    },
    {
      label: "Service reviews",
      value: formatCompactNumber(misconfiguredProviders.length),
      meta: "Check service dashboards",
    },
    {
      label: "Active gyms",
      value: formatCompactNumber(
        organizations.filter((org) => org.status === "ACTIVE").length,
      ),
      meta: "Allowed to operate",
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
      signal: `${misconfiguredProviders.length} service issue${misconfiguredProviders.length === 1 ? "" : "s"} · ${openFlags.length} safety review${openFlags.length === 1 ? "" : "s"}`,
    },
    {
      step: "Check service dashboards",
      owner: "Ops",
      signal: misconfiguredProviders.length
        ? misconfiguredProviders.map(([category]) => formatEnumLabel(category)).join(", ")
        : "All service checks are clear",
    },
    {
      step: "Pause risky gym actions",
      owner: "Support",
      signal: suspendedOrganizations.length
        ? `${suspendedOrganizations.length} paused gym${suspendedOrganizations.length === 1 ? "" : "s"}`
        : "No paused gyms",
    },
    {
      step: "Notify trial owners",
      owner: "Business",
      signal: trialRiskOrganizations.length
        ? `${trialRiskOrganizations.length} active trial${trialRiskOrganizations.length === 1 ? "" : "s"} near conversion`
        : "No active trial expires this week",
    },
  ], [misconfiguredProviders, openFlags.length, suspendedOrganizations.length, trialRiskOrganizations.length]);

  function openOrganizationStatusDialog(
    org: PlatformOrganization,
    status: "ACTIVE" | "SUSPENDED" | "CANCELLED",
  ) {
    setStatusError("");
    setOrganizationStatusDialog({ org, status, confirmation: "" });
  }

  async function submitOrganizationStatus() {
    const dialog = organizationStatusDialog;
    if (!dialog) return;
    const { org, status } = dialog;
    const expected = `${status} ${org.username}`;
    if (dialog.confirmation.trim() !== expected) {
      setStatusError(`Type ${expected} to change this gym status.`);
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
        cause instanceof Error ? cause.message : "Unable to update gym status.",
      );
    } finally {
      setBusyOrgId(null);
    }
  }

  async function softDeleteOrganization(org: PlatformOrganization) {
    try {
      setStatusError("");
      setBusyOrgId(org.id);
      await webApiFetch(`/api/platform/orgs/${org.id}/soft-delete`, {
        method: "POST",
        body: { reason: organizationActionDialog?.reason.trim() },
      });
      organizationsState.reload();
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Unable to archive gym account.",
      );
    } finally {
      setBusyOrgId(null);
    }
  }

  function openOrganizationAction(kind: OrganizationActionKind, org: PlatformOrganization) {
    setStatusError("");
    setOrganizationActionDialog({
      kind,
      org,
      name: org.name,
      username: org.username,
      tier: "GROWTH",
      days: "",
      rupees: "",
      newOwnerUserId: "",
      csv: "",
      reason: "",
      confirmation: "",
    });
  }

  async function submitOrganizationAction() {
    const dialog = organizationActionDialog;
    if (!dialog) return;
    const orgId = dialog.org.id;
    const reason = dialog.reason.trim();
    try {
      setStatusError("");
      if (dialog.kind === "extend-trial") {
        const days = Number(dialog.days.trim());
        if (!Number.isInteger(days) || days < 1) {
          setStatusError("Enter a whole number of trial days.");
          return;
        }
        if (!reason) {
          setStatusError("Add a reason for the trial extension.");
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/trial/extend`, "POST", {
          days,
          reason,
        });
      } else if (dialog.kind === "credit") {
        const rupees = Number(dialog.rupees.trim());
        const expected = `CREDIT ${dialog.org.username}`;
        if (!Number.isFinite(rupees) || rupees === 0) {
          setStatusError("Enter a non-zero rupee amount.");
          return;
        }
        if (dialog.confirmation.trim() !== expected) {
          setStatusError(`Type ${expected} to adjust credit.`);
          return;
        }
        if (!reason) {
          setStatusError("Add a reason for the credit adjustment.");
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/credit`, "POST", {
          paise: Math.round(rupees * 100),
          reason,
        });
      } else if (dialog.kind === "tier") {
        const tier = dialog.tier.trim().toUpperCase();
        if (!["FREE", "STARTER", "GROWTH", "PRO"].includes(tier)) {
          setStatusError("Choose a valid tier.");
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/tier`, "PATCH", { tier });
      } else if (dialog.kind === "rename") {
        const name = dialog.name.trim();
        const username = dialog.username.trim();
        if (!name || !username || !reason) {
          setStatusError("Name, username, and reason are required.");
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/rename`, "POST", {
          name,
          username,
          reason,
        });
      } else if (dialog.kind === "import-members") {
        const csv = dialog.csv.trim();
        if (!csv) {
          setStatusError("Paste a CSV with a name,email header.");
          return;
        }
        const preview = previewMemberCsv(csv);
        if (preview.error || !preview.rows.length) {
          setStatusError(preview.error ?? "CSV must contain at least one data row.");
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/bulk-import-members`, "POST", {
          csv,
        });
      } else if (dialog.kind === "transfer-owner") {
        const newOwnerUserId = dialog.newOwnerUserId.trim();
        const expected = `TRANSFER ${dialog.org.username}`;
        if (!newOwnerUserId || !reason) {
          setStatusError("New owner user ID and reason are required.");
          return;
        }
        if (dialog.confirmation.trim() !== expected) {
          setStatusError(`Type ${expected} to transfer ownership.`);
          return;
        }
        await runOrgAction(orgId, `/api/platform/orgs/${orgId}/transfer-ownership`, "POST", {
          newOwnerUserId,
          reason,
        });
      } else if (dialog.kind === "archive") {
        const expected = `DELETE ${dialog.org.username}`;
        if (dialog.confirmation.trim() !== expected) {
          setStatusError(`Type ${expected} to archive this gym.`);
          return;
        }
        if (!reason) {
          setStatusError("Add a reason for archiving this gym.");
          return;
        }
        await softDeleteOrganization(dialog.org);
      }
      setOrganizationActionDialog(null);
    } catch (cause) {
      setStatusError(cause instanceof Error ? cause.message : "Unable to complete gym action.");
    }
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
      setSupportNotice("Gym account updated");
      organizationsState.reload();
    } catch (cause) {
      setStatusError(
        cause instanceof Error ? cause.message : "Unable to update gym account.",
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

  function openImpersonationDialog(user: PlatformUserRow) {
    setStatusError("");
    setSupportActionDialog({
      kind: "impersonate",
      userId: user.id,
      label: user.email,
      reason: "",
      confirmation: "",
    });
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

  function openRefundDialog(payment: PlatformPaymentRow) {
    setStatusError("");
    setSupportActionDialog({
      kind: "refund",
      paymentId: payment.id,
      label: `${payment.id} · ${formatInr(payment.amountPaise)}`,
      reason: "",
      confirmation: "",
    });
  }

  async function submitSupportAction() {
    const dialog = supportActionDialog;
    if (!dialog) return;
    const reason = dialog.reason.trim();
    if (!reason) {
      setStatusError("Add a reason before continuing.");
      return;
    }
    if (dialog.kind === "impersonate") {
      if (dialog.confirmation.trim() !== "IMPERSONATE") {
        setStatusError("Type IMPERSONATE to start the support session.");
        return;
      }
      await webApiFetch(`/api/platform/users/${dialog.userId}/impersonate`, {
        method: "POST",
        body: { reason, ttlMinutes: 15 },
      });
      setSupportActionDialog(null);
      setSupportNotice("Impersonation started");
      return;
    }
    if (dialog.confirmation.trim() !== "REFUND") {
      setStatusError("Type REFUND to submit the refund.");
      return;
    }
    await webApiFetch(`/api/platform/payments/${dialog.paymentId}/refund`, {
      method: "POST",
      body: { reason },
    });
    setSupportActionDialog(null);
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

  function openBroadcastComposer() {
    setStatusError("");
    setBroadcastComposeDialog({
      title: "",
      body: "",
      severity: "INFO",
      status: "DRAFT",
    });
  }

  async function submitBroadcast() {
    const dialog = broadcastComposeDialog;
    if (!dialog) return;
    const title = dialog.title.trim();
    const body = dialog.body.trim();
    if (!title || !body) {
      setStatusError("Broadcast title and body are required.");
      return;
    }
    try {
      setStatusError("");
      setBroadcastBusyId("new");
      await webApiFetch("/api/platform/broadcasts", {
        method: "POST",
        body: {
          title,
          body,
          severity: dialog.severity,
          status: dialog.status,
          targetOrgIds: [],
          targetRoles: [],
        },
      });
      setBroadcastComposeDialog(null);
      setSupportNotice("Broadcast saved");
      broadcastsState.reload();
    } finally {
      setBroadcastBusyId(null);
    }
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
      setSupportNotice(cause instanceof Error ? cause.message : "Unable to delete broadcast", "red");
    } finally {
      setBroadcastBusyId(null);
    }
  }

  function openModerationDecision(flag: PlatformModerationRow, decision: "APPROVED" | "REMOVED") {
    setStatusError("");
    setModerationDecisionDialog({
      flagId: flag.id,
      label: `${formatEnumLabel(flag.kind)} · ${flag.targetId ?? flag.orgId}`,
      decision,
      reason: "",
    });
  }

  async function submitModerationDecision() {
    const dialog = moderationDecisionDialog;
    if (!dialog) return;
    const reason = dialog.reason.trim();
    if (!reason) {
      setStatusError("Add a reason for the moderation decision.");
      return;
    }
    try {
      setModerationBusyId(dialog.flagId);
      await webApiFetch("/api/platform/moderation", {
        method: "POST",
        body: { id: dialog.flagId, decision: dialog.decision, reason },
      });
      setModerationDecisionDialog(null);
      setSupportNotice("Moderation decision saved");
      moderationState.reload();
    } finally {
      setModerationBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <PlatformHealthCockpit
        show={showReadiness}
        items={cockpitItems}
        misconfiguredProviderCount={misconfiguredProviders.length}
        organizationCount={organizations.length}
        trialRiskCount={trialRiskOrganizations.length}
        openFlagCount={openFlags.length}
      />

      <PlatformSupportConsoleSection
        showUsers={showUsers}
        showPayments={showPayments}
        supportNotice={supportNotice}
        usersLoading={usersState.loading}
        usersError={usersState.error}
        userRows={userRows}
        userQuery={userQuery}
        selectedUser={selectedUser}
        userDetailBusyId={userDetailBusyId}
        paymentsLoading={paymentsState.loading}
        paymentsError={paymentsState.error}
        paymentRows={paymentRows}
        paymentQuery={paymentQuery}
        selectedPayment={selectedPayment}
        paymentDetailBusyId={paymentDetailBusyId}
        onUserQueryChange={setUserQuery}
        onPaymentQueryChange={setPaymentQuery}
        onSearchUsers={() => void searchUsers()}
        onSearchPayments={() => void searchPayments()}
        onLoadUserDetails={(userId) => void loadUserDetails(userId)}
        onCloseUserDetails={() => setSelectedUser(null)}
        onRevokeUserSessions={(userId) => void revokeUserSessions(userId)}
        onOpenImpersonationDialog={openImpersonationDialog}
        onLoadPaymentDetails={(paymentId) => void loadPaymentDetails(paymentId)}
        onClosePaymentDetails={() => setSelectedPayment(null)}
        onOpenRefundDialog={openRefundDialog}
      />

      <PlatformContentSections
        showBroadcasts={showBroadcasts}
        showModeration={showModeration}
        broadcasts={broadcasts}
        moderationFlags={moderationFlags}
        broadcastBusyId={broadcastBusyId}
        moderationBusyId={moderationBusyId}
        formatDateTime={formatDateTime}
        formatEnumLabel={formatEnumLabel}
        onOpenBroadcastComposer={openBroadcastComposer}
        onUpdateBroadcastStatus={(broadcast, status) => void updateBroadcastStatus(broadcast, status)}
        onDeleteBroadcast={(broadcastId) => void deleteBroadcast(broadcastId)}
        onOpenModerationDecision={openModerationDecision}
      />

      {showImpersonations ? (
      <PlatformImpersonationsSection
        impersonations={impersonations}
        formatDateTime={formatDateTime}
      />
      ) : null}

      <PlatformOpsSections
        showFeatureFlags={showFeatureFlags}
        showWebhooks={showWebhooks}
        showAudit={showAudit}
        featureFlags={featureFlags}
        webhooks={webhooks}
        auditLogs={auditLogs}
        formatDateTime={formatDateTime}
        formatEnumLabel={formatEnumLabel}
        onToggleFeatureFlag={(flag) => void toggleFeatureFlag(flag)}
        onReplayWebhook={(attemptId) => void replayWebhook(attemptId)}
      />

      <PlatformReadinessSections
        showReadiness={showReadiness}
        showIncidentChecklist={showIncidentChecklist}
        providerEntries={providerEntries}
        readyProviderCount={readyProviders.length}
        defaultProviderCount={defaultProviders.length}
        misconfiguredProviderCount={misconfiguredProviders.length}
        openFlagCount={openFlags.length}
        incidentChecklist={incidentChecklist}
        formatDateTime={formatDateTime}
        formatEnumLabel={formatEnumLabel}
        onReloadProviders={() => providersState.reload()}
      />

      <PlatformOrganizationsSection
        show={showOrganizations}
        organizations={organizations}
        selectedOrganization={selectedOrganization}
        suspendedOrganizations={suspendedOrganizations}
        trialRiskOrganizations={trialRiskOrganizations}
        openFlags={openFlags}
        usage={usage}
        statusError={statusError}
        organizationsError={organizationsState.error}
        busyOrgId={busyOrgId}
        onSelectOrganization={setSelectedOrganization}
        onCloseOrganization={() => setSelectedOrganization(null)}
        onOpenStatusDialog={openOrganizationStatusDialog}
        onOpenOrganizationAction={openOrganizationAction}
      />

      {showAssistant || showSubscriptions || showSafety ? (
      <div
        className={`grid gap-4 ${
          [showAssistant, showSubscriptions, showSafety].filter(Boolean).length > 1
            ? "xl:grid-cols-[1.05fr_0.95fr]"
            : ""
        }`}
      >
        <PlatformAssistantSection
          show={showAssistant}
          usage={usage}
          loading={usageState.loading}
          error={usageState.error}
          formatEnumLabel={formatEnumLabel}
        />

        {showSubscriptions ? (
          <PlatformSubscriptionsSection
            mode={
              activeSection === "referrals"
                ? "referrals"
                : activeSection === "business-overview"
                  ? "overview"
                  : "subscriptions"
            }
            initialFlags={initialFlags}
          />
        ) : null}

        <PlatformSafetySection
          show={showSafety}
          flags={flags}
          openFlagCount={openFlags.length}
          error={flagsState.error}
          formatDateTime={formatDateTime}
          formatEnumLabel={formatEnumLabel}
        />
      </div>
      ) : null}
      <PlatformOperationDialogs
        organizationActionDialog={organizationActionDialog}
        organizationStatusDialog={organizationStatusDialog}
        broadcastComposeDialog={broadcastComposeDialog}
        supportActionDialog={supportActionDialog}
        moderationDecisionDialog={moderationDecisionDialog}
        busyOrgId={busyOrgId}
        broadcastBusyId={broadcastBusyId}
        moderationBusyId={moderationBusyId}
        setOrganizationActionDialog={setOrganizationActionDialog}
        setOrganizationStatusDialog={setOrganizationStatusDialog}
        setBroadcastComposeDialog={setBroadcastComposeDialog}
        setSupportActionDialog={setSupportActionDialog}
        setModerationDecisionDialog={setModerationDecisionDialog}
        onSubmitOrganizationAction={() => void submitOrganizationAction()}
        onSubmitOrganizationStatus={() => void submitOrganizationStatus()}
        onSubmitBroadcast={() => void submitBroadcast()}
        onSubmitSupportAction={() => void submitSupportAction()}
        onSubmitModerationDecision={() => void submitModerationDecision()}
      />
    </div>
  );
}
