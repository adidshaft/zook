"use client";

import Link from "next/link";
import { useState } from "react";
import { AttendanceApprovalsPanel } from "./attendance-approvals-panel";
import { AttendanceQrPanel } from "./attendance-qr-panel";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "./dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "./glass-card";
import { GymProfileSetupPanel } from "./gym-profile-setup-panel";
import { NotificationComposerPanel } from "./notification-composer-panel";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import { useOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";

type DashboardMode =
  | "overview"
  | "members"
  | "join-requests"
  | "attendance"
  | "notifications"
  | "reports"
  | "shop"
  | "staff"
  | "plans"
  | "payments"
  | "audit"
  | "ai"
  | "public-profile";

type OrganizationSummary = {
  activeMembers: number;
  joinRequests: number;
  expiringMemberships: number;
  todayAttendance: number;
  pendingAttendanceApprovals: number;
  cashCollectedPaise: number;
  revenuePaise: number;
  lowStockProducts: number;
  notificationQueueCount: number;
  aiUsageThisMonth: number;
  trialDaysRemaining: number;
};

type OrganizationSnapshot = {
  id: string;
  name: string;
  city: string;
  state?: string | null;
  status: string;
  joinMode: string;
  attendanceMode: string;
  trialEndAt?: string | Date | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

type BranchScopeSnapshot = {
  branches: Array<{ id: string; name: string; isDefault: boolean; active: boolean }>;
  defaultBranch: { id: string; name: string; isDefault: boolean; active: boolean } | null;
  selectedBranch: { id: string; name: string; isDefault: boolean; active: boolean } | null;
  mode: string;
  inventoryScope: string;
};

type JoinRequestRow = {
  id: string;
  userId: string;
  planId?: string | null;
  status: string;
  referralCode?: string | null;
  message?: string | null;
  createdAt: string | Date;
  reviewedAt?: string | Date | null;
};

type MemberRow = {
  profile: {
    id: string;
    createdAt: string;
    marketingOptIn?: boolean | null;
    publicVisibility?: boolean | null;
    profilePhotoUrl?: string | null;
    notes?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    fitnessGoal?: string | null;
    marketingOptIn?: boolean | null;
    createdAt: string;
  } | null;
};

type MembershipPlanRow = {
  id: string;
  name: string;
  type: string;
  pricePaise: number;
  active: boolean;
  publicVisible: boolean;
  durationDays?: number | null;
  visitLimit?: number | null;
  validityDays?: number | null;
  createdAt: string;
};

type StaffAssignmentRow = {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
};

type StaffUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
};

type CoachPlanRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  aiGenerated: boolean;
  reviewed: boolean;
  assignmentCount: number;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  pricePaise: number;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

type ShopOrderItemRow = {
  id: string;
  productId: string;
  quantity: number;
  unitPaise: number;
};

type ShopOrderRow = {
  id: string;
  userId: string;
  status: string;
  totalPaise: number;
  pickupCode?: string | null;
  createdAt: string;
  fulfilledAt?: string | null;
  items: ShopOrderItemRow[];
};

type AIUsageRow = {
  id: string;
  role: string;
  provider: string;
  requestType: string;
  promptSummary: string;
  responseSummary?: string | null;
  tokenEstimate: number;
  costEstimatePaise: number;
  quotaConsumed: number;
  imageCount: number;
  safetyFlags?: unknown;
  createdAt: string | Date;
};

type AuditLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  requestId?: string | null;
  metadata?: unknown;
  createdAt: string;
};

type NotificationSnapshot = {
  id: string;
  title: string;
  type: string;
  status: string;
  audience?: string | null;
  createdAt: string | Date;
};

type ProductSnapshot = {
  id: string;
  name: string;
  pricePaise?: number | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
};

function resolveMode(sectionKey: string): DashboardMode {
  if (sectionKey.includes("public-profile") || sectionKey === "org" || sectionKey === "settings") {
    return "public-profile";
  }
  if (sectionKey.includes("join-requests")) {
    return "join-requests";
  }
  if (sectionKey.includes("attendance")) {
    return "attendance";
  }
  if (sectionKey.includes("notifications")) {
    return "notifications";
  }
  if (sectionKey.includes("reports")) {
    return "reports";
  }
  if (sectionKey.includes("shop")) {
    return "shop";
  }
  if (
    sectionKey.includes("staff") ||
    sectionKey.includes("trainers") ||
    sectionKey.includes("pt")
  ) {
    return "staff";
  }
  if (
    sectionKey.includes("membership-plans") ||
    sectionKey === "plans" ||
    sectionKey.includes("/plans")
  ) {
    return "plans";
  }
  if (sectionKey.includes("payments") || sectionKey.includes("checkout")) {
    return "payments";
  }
  if (sectionKey.includes("audit")) {
    return "audit";
  }
  if (sectionKey.includes("members")) {
    return "members";
  }
  if (sectionKey.includes("ai")) {
    return "ai";
  }
  return "overview";
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p className="rounded-[22px] border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
      {message}
    </p>
  );
}

function countFlags(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length;
  }
  return 0;
}

function formatPlanShape(plan: MembershipPlanRow) {
  if (plan.type === "DURATION" && plan.durationDays) {
    return `${plan.durationDays} days`;
  }
  if (plan.type === "VISIT_PACK" && plan.visitLimit) {
    return `${plan.visitLimit} visits`;
  }
  if (plan.type === "HYBRID") {
    return `${plan.durationDays ?? "Flexible"} days / ${plan.visitLimit ?? "Open"} visits`;
  }
  if (plan.validityDays) {
    return `${plan.validityDays} days validity`;
  }
  return "Configured in service layer";
}

export function DashboardOperationalPanel({
  orgId,
  sectionKey,
  organization,
  summary,
  branchScope,
  auditLogCount,
  initialJoinRequests,
  initialNotifications,
  initialProducts,
  initialAiUsage,
}: {
  orgId: string;
  sectionKey: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  auditLogCount: number;
  initialJoinRequests: JoinRequestRow[];
  initialNotifications: NotificationSnapshot[];
  initialProducts: ProductSnapshot[];
  initialAiUsage: AIUsageRow[];
}) {
  const mode = resolveMode(sectionKey);
  const [queueBusyId, setQueueBusyId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState("");
  const [planForm, setPlanForm] = useState({
    name: "",
    type: "HYBRID" as "DURATION" | "VISIT_PACK" | "DATE_RANGE" | "HYBRID" | "TRIAL",
    priceRupees: "",
    durationDays: "",
    visitLimit: "",
    description: "",
    publicVisible: true,
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category: "OTHER" as
      | "WATER"
      | "PROTEIN_SHAKE"
      | "SHAKER"
      | "TOWEL"
      | "SUPPLEMENT"
      | "OTHER",
    priceRupees: "",
    stock: "",
    lowStockThreshold: "5",
    description: "",
  });
  const [staffInvite, setStaffInvite] = useState({
    email: "",
    role: "TRAINER" as "ADMIN" | "RECEPTIONIST" | "TRAINER",
  });
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState<"plan" | "product" | "staff" | null>(null);

  const membersState = useOperationalResource<{ members: MemberRow[] }>({
    path: `/api/orgs/${orgId}/members`,
    enabled: mode === "members",
  });
  const joinRequestsState = useOperationalResource<{ joinRequests: JoinRequestRow[] }>({
    path: `/api/orgs/${orgId}/join-requests`,
    enabled: mode === "members" || mode === "join-requests",
    ...(mode === "members" || mode === "join-requests"
      ? { initialData: { joinRequests: initialJoinRequests } }
      : {}),
  });
  const membershipPlansState = useOperationalResource<{ plans: MembershipPlanRow[] }>({
    path: `/api/orgs/${orgId}/membership-plans`,
    enabled:
      mode === "members" || mode === "join-requests" || mode === "plans" || mode === "payments",
  });
  const staffState = useOperationalResource<{ staff: StaffAssignmentRow[]; users: StaffUserRow[] }>(
    {
      path: `/api/orgs/${orgId}/staff`,
      enabled: mode === "staff",
    },
  );
  const coachPlansState = useOperationalResource<{ plans: CoachPlanRow[] }>({
    path: `/api/orgs/${orgId}/plans`,
    enabled: mode === "staff" || mode === "plans" || mode === "ai",
  });
  const productsState = useOperationalResource<{ products: ProductRow[] }>({
    path: `/api/orgs/${orgId}/products`,
    enabled: mode === "shop" || mode === "payments",
  });
  const shopOrdersState = useOperationalResource<{ orders: ShopOrderRow[] }>({
    path: `/api/orgs/${orgId}/shop/orders`,
    enabled: mode === "shop" || mode === "payments",
  });
  const auditLogsState = useOperationalResource<{ auditLogs: AuditLogRow[] }>({
    path: `/api/orgs/${orgId}/audit-logs`,
    enabled: mode === "audit",
  });
  const aiUsageState = useOperationalResource<{ usage: AIUsageRow[] }>({
    path: `/api/orgs/${orgId}/ai/usage`,
    enabled: mode === "audit" || mode === "ai",
    ...(mode === "audit" || mode === "ai" ? { initialData: { usage: initialAiUsage } } : {}),
  });

  const membershipPlans = membershipPlansState.data?.plans ?? [];
  const members = membersState.data?.members ?? [];
  const joinRequests = joinRequestsState.data?.joinRequests ?? initialJoinRequests;
  const staffAssignments = staffState.data?.staff ?? [];
  const staffUsers = staffState.data?.users ?? [];
  const coachPlans = coachPlansState.data?.plans ?? [];
  const inventory = productsState.data?.products ?? [];
  const shopOrders = shopOrdersState.data?.orders ?? [];
  const auditLogs = auditLogsState.data?.auditLogs ?? [];
  const aiUsage = aiUsageState.data?.usage ?? initialAiUsage;
  const selectedBranchName = branchScope.selectedBranch?.name ?? "Default Branch missing";

  const planNamesById = new Map(membershipPlans.map((plan) => [plan.id, plan.name]));
  const staffUsersById = new Map(staffUsers.map((user) => [user.id, user]));

  const queuedOrders = shopOrders.filter(
    (order) => order.status === "PENDING_PAYMENT" || order.status === "PAID",
  );
  const readyOrders = shopOrders.filter((order) => order.status === "READY_FOR_PICKUP");
  const misconfiguredAiCount = aiUsage.filter((row) => countFlags(row.safetyFlags) > 0).length;

  const overviewWorkflowCards: Array<{
    label: string;
    href: string;
    detail: string;
    tone: PillTone;
  }> = [
    {
      label: "Display QR entry",
      href: "/dashboard/attendance/approvals",
      detail: `${summary.todayAttendance} scans today`,
      tone: "lime",
    },
    {
      label: "Clear join requests",
      href: "/dashboard/members",
      detail: `${summary.joinRequests} memberships waiting`,
      tone: summary.joinRequests > 0 ? "amber" : "lime",
    },
    {
      label: "Check inventory pressure",
      href: "/dashboard/shop/products",
      detail: `${summary.lowStockProducts} low-stock products`,
      tone: summary.lowStockProducts > 0 ? "amber" : "blue",
    },
    {
      label: "Review AI usage",
      href: "/dashboard/ai",
      detail: `${summary.aiUsageThisMonth} AI events this month`,
      tone: summary.aiUsageThisMonth > 0 ? "blue" : "neutral",
    },
  ];

  async function updateJoinRequest(requestId: string, action: "approve" | "reject") {
    try {
      setQueueError("");
      setQueueBusyId(requestId);
      await webApiFetch(`/api/orgs/${orgId}/join-requests/${requestId}/${action}`, {
        method: "POST",
      });
      joinRequestsState.reload();
      membersState.reload();
    } catch (cause) {
      setQueueError(cause instanceof Error ? cause.message : "Unable to update the join request.");
    } finally {
      setQueueBusyId(null);
    }
  }

  async function createMembershipPlan() {
    try {
      setFormBusy("plan");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans`, {
        method: "POST",
        body: {
          name: planForm.name,
          description: planForm.description || undefined,
          type: planForm.type,
          pricePaise: Math.round(Number(planForm.priceRupees || 0) * 100),
          durationDays: planForm.durationDays ? Number(planForm.durationDays) : undefined,
          visitLimit: planForm.visitLimit ? Number(planForm.visitLimit) : undefined,
          validityDays: planForm.durationDays ? Number(planForm.durationDays) : undefined,
          publicVisible: planForm.publicVisible,
        },
      });
      setPlanForm({
        name: "",
        type: "HYBRID",
        priceRupees: "",
        durationDays: "",
        visitLimit: "",
        description: "",
        publicVisible: true,
      });
      membershipPlansState.reload();
      setFormStatus("Membership plan created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create membership plan.");
    } finally {
      setFormBusy(null);
    }
  }

  async function createProduct() {
    try {
      setFormBusy("product");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products`, {
        method: "POST",
        body: {
          name: productForm.name,
          description: productForm.description || undefined,
          category: productForm.category,
          pricePaise: Math.round(Number(productForm.priceRupees || 0) * 100),
          stock: Number(productForm.stock || 0),
          lowStockThreshold: Number(productForm.lowStockThreshold || 0),
          active: true,
        },
      });
      setProductForm({
        name: "",
        category: "OTHER",
        priceRupees: "",
        stock: "",
        lowStockThreshold: "5",
        description: "",
      });
      productsState.reload();
      setFormStatus("Shop product created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create product.");
    } finally {
      setFormBusy(null);
    }
  }

  async function inviteStaff() {
    try {
      setFormBusy("staff");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/invite`, {
        method: "POST",
        body: staffInvite,
      });
      setStaffInvite({ email: "", role: "TRAINER" });
      staffState.reload();
      setFormStatus("Staff invite created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to invite staff.");
    } finally {
      setFormBusy(null);
    }
  }

  if (mode === "public-profile") {
    return <GymProfileSetupPanel orgId={orgId} />;
  }

  if (mode === "attendance") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <AttendanceApprovalsPanel orgId={orgId} />
          <div className="grid gap-4">
            <AttendanceQrPanel orgId={orgId} />
            <GlassCard>
              <SectionHeader
                eyebrow="Entry Protocol"
                title="QR code and entry codes"
                description="Members scan the displayed gym QR, receive a unique entry code, and show it at the floor or desk."
                badge={<StatusPill value="Self-approved QR" tone="lime" />}
              />
              <ReadoutGrid
                className="mt-5"
                items={[
                {
                  label: "Branch scope",
                  value: selectedBranchName,
                  meta: branchScope.selectedBranch
                    ? "QR and member attendance use this branch"
                    : "Add a default branch before production launch",
                },
                {
                  label: "Today scans",
                  value: formatCompactNumber(summary.todayAttendance),
                  meta: "Members receive visible entry codes",
                  },
                  {
                    label: "Join mode",
                    value: formatEnumLabel(organization.joinMode),
                    meta: "Used during membership handoffs",
                  },
                  {
                    label: "Trial window",
                    value: formatDaysRemaining(summary.trialDaysRemaining),
                    meta: formatDate(organization.trialEndAt),
                  },
                ]}
                columns={1}
              />
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "notifications") {
    return (
      <div className="grid gap-4">
        <NotificationComposerPanel orgId={orgId} />
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <SectionHeader
              eyebrow="Guardrails"
              title="Delivery posture"
              description="Operational messages should stay crisp, permission-safe, and relevant to the floor or membership journey."
              badge={
                <Pill tone={summary.notificationQueueCount > 0 ? "amber" : "lime"}>
                  {summary.notificationQueueCount} queued
                </Pill>
              }
            />
            <ReadoutGrid
              className="mt-5"
              items={[
                {
                  label: "Org status",
                  value: formatEnumLabel(organization.status),
                  meta: "Broadcasts respect active org availability",
                },
                {
                  label: "Recent sends",
                  value: formatCompactNumber(initialNotifications.length),
                  meta: "Current history in this org snapshot",
                },
                {
                  label: "Audience mode",
                  value:
                    summary.activeMembers > 0 ? "Live member targeting" : "No active audience yet",
                  meta: "Uses persisted org memberships",
                },
                {
                  label: "Escalation load",
                  value:
                    summary.pendingAttendanceApprovals > 0
                      ? `${summary.pendingAttendanceApprovals} pending`
                      : "Clear",
                  meta: "Useful for operational notices",
                },
              ]}
              columns={2}
            />
          </GlassCard>
          <GlassCard>
            <SectionHeader
              eyebrow="Recent Messages"
              title="Current message mix"
              description="A quick read on the most recent notifications coming out of this organization."
            />
            <div className="mt-5 grid gap-3">
              {initialNotifications.length ? (
                initialNotifications.slice(0, 4).map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{notification.title}</p>
                      <StatusPill value={formatEnumLabel(notification.status)} />
                    </div>
                    <p className="mt-2 text-xs text-white/45">
                      {formatEnumLabel(notification.type)}
                      {notification.audience ? ` · ${formatEnumLabel(notification.audience)}` : ""}
                      {" · "}
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No notifications in history yet"
                  description="Compose a first operational message to seed this surface and validate the org’s delivery lane."
                />
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (mode === "members" || mode === "join-requests") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="xl:col-span-1">
            <SectionHeader
              eyebrow="Members"
              title="Roster and contact posture"
              description="Profiles here come from the persisted membership directory, so owners and admins are reading the same book."
              badge={<Pill tone="lime">{members.length} profiles</Pill>}
            />
            <div className="mt-5">
              {membersState.error ? (
                <ErrorNotice message={membersState.error} />
              ) : membersState.loading && members.length === 0 ? (
                <EmptyState
                  title="Loading member roster"
                  description="Pulling the latest organization member list."
                />
              ) : (
                <DataTable
                  columns={[
                    {
                      id: "member",
                      header: "Member",
                      render: (row) => (
                        <div>
                          <p className="font-medium text-white">
                            {row.user?.name ?? "Member profile"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.user?.email ?? "No email recorded"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "contact",
                      header: "Contact",
                      render: (row) => (
                        <div>
                          <p>
                            {row.user?.phone ??
                              organization.contactPhone ??
                              "Desk follow-up needed"}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {row.user?.fitnessGoal ?? "Goal capture pending"}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "profile",
                      header: "Profile state",
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          <StatusPill
                            value={row.profile.publicVisibility ? "Visible" : "Private"}
                            tone={row.profile.publicVisibility ? "blue" : "neutral"}
                          />
                          <StatusPill
                            value={row.profile.marketingOptIn ? "Marketing on" : "Marketing off"}
                            tone={row.profile.marketingOptIn ? "lime" : "amber"}
                          />
                        </div>
                      ),
                    },
                    {
                      id: "joined",
                      header: "Created",
                      render: (row) => formatDate(row.profile.createdAt),
                    },
                  ]}
                  rows={members}
                  rowKey={(row) => row.profile.id}
                  empty="No member profiles are available for this organization yet."
                />
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Pipeline"
              title="Join request queue"
              description="Approval-required flows surface here so ownership can clear or stop memberships before payment."
              badge={
                <Pill tone={joinRequests.length ? "amber" : "lime"}>
                  {joinRequests.length} pending
                </Pill>
              }
            />
            {queueError ? (
              <div className="mt-5">
                <ErrorNotice message={queueError} />
              </div>
            ) : null}
            <div className="mt-5 grid gap-3">
              {joinRequestsState.error ? (
                <ErrorNotice message={joinRequestsState.error} />
              ) : joinRequests.length ? (
                joinRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-white">
                            {planNamesById.get(request.planId ?? "") ?? "Membership request"}
                          </p>
                          <StatusPill value={formatEnumLabel(request.status)} />
                        </div>
                        <p className="mt-2 text-xs text-white/45">
                          Created {formatDateTime(request.createdAt)}
                          {request.referralCode ? ` · Referral ${request.referralCode}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-white/60">
                          {request.message ?? "No intake note was added by the member."}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => void updateJoinRequest(request.id, "approve")}
                          disabled={queueBusyId === request.id}
                          className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void updateJoinRequest(request.id, "reject")}
                          disabled={queueBusyId === request.id}
                          className="zook-focus rounded-full border border-red-300/30 bg-red-300/10 px-4 py-2 text-sm text-red-100 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Queue is clear"
                  description="Open-join or already-reviewed memberships will not stack up here."
                />
              )}
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <SectionHeader
            eyebrow="Commercial Setup"
            title="Membership plan ladder"
            description="Use the live pricing ladder below to see which plans are public, how they are shaped, and which ones are currently active."
            badge={<Pill tone="blue">{membershipPlans.length} plans</Pill>}
          />
          <div className="mt-5">
            {membershipPlansState.error ? (
              <ErrorNotice message={membershipPlansState.error} />
            ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
              <EmptyState
                title="Loading plan ladder"
                description="Pulling the latest membership plans for this organization."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "plan",
                    header: "Plan",
                    render: (plan) => (
                      <div>
                        <p className="font-medium text-white">{plan.name}</p>
                        <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                      </div>
                    ),
                  },
                  {
                    id: "shape",
                    header: "Shape",
                    render: (plan) => formatPlanShape(plan),
                  },
                  {
                    id: "price",
                    header: "Price",
                    align: "right",
                    render: (plan) => (
                      <span className="font-medium text-white">{formatInr(plan.pricePaise)}</span>
                    ),
                  },
                  {
                    id: "state",
                    header: "State",
                    render: (plan) => (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          value={plan.active ? "Active" : "Paused"}
                          tone={plan.active ? "lime" : "amber"}
                        />
                        <StatusPill
                          value={plan.publicVisible ? "Public" : "Private"}
                          tone={plan.publicVisible ? "blue" : "neutral"}
                        />
                      </div>
                    ),
                  },
                ]}
                rows={membershipPlans}
                rowKey={(plan) => plan.id}
                empty="No membership plans are available yet."
              />
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (mode === "shop") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Orders"
            title="Pickup and fulfillment queue"
            description="These are the live shop orders that the desk can monitor before pickup and fulfillment."
            badge={
              <Pill tone={readyOrders.length ? "amber" : "lime"}>{readyOrders.length} ready</Pill>
            }
          />
          <div className="mt-5">
            {shopOrdersState.error ? (
              <ErrorNotice message={shopOrdersState.error} />
            ) : shopOrdersState.loading && shopOrders.length === 0 ? (
              <EmptyState
                title="Loading shop orders"
                description="Pulling the latest order queue for this org."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "order",
                    header: "Order",
                    render: (order) => (
                      <div>
                        <p className="font-medium text-white">{order.id.slice(-8).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {order.items.length} line items
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "status",
                    header: "Status",
                    render: (order) => <StatusPill value={formatEnumLabel(order.status)} />,
                  },
                  {
                    id: "pickup",
                    header: "Pickup",
                    render: (order) => order.pickupCode ?? "Awaiting code",
                  },
                  {
                    id: "total",
                    header: "Total",
                    align: "right",
                    render: (order) => (
                      <span className="font-medium text-white">{formatInr(order.totalPaise)}</span>
                    ),
                  },
                ]}
                rows={shopOrders}
                rowKey={(order) => order.id}
                empty="No shop orders are currently recorded for this organization."
              />
            )}
          </div>
        </GlassCard>

        <div className="grid gap-4">
          <GlassCard>
            <SectionHeader
              eyebrow="Inventory"
              title="Low-stock watch"
              description="Inventory is sorted by stock so desk and owner surfaces can quickly spot refill pressure."
              badge={
                <Pill tone={summary.lowStockProducts > 0 ? "amber" : "lime"}>
                  {summary.lowStockProducts} low
                </Pill>
              }
            />
            <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">Add shop product</p>
                  <p className="mt-1 text-xs text-white/45">Creates a real inventory item.</p>
                </div>
                <Pill tone="blue">Create</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Product name"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <select
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      category: event.target.value as typeof productForm.category,
                    }))
                  }
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  {["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"].map((category) => (
                    <option key={category} value={category} className="bg-black">
                      {formatEnumLabel(category)}
                    </option>
                  ))}
                </select>
                <input
                  value={productForm.priceRupees}
                  onChange={(event) => setProductForm((current) => ({ ...current, priceRupees: event.target.value }))}
                  placeholder="Price in rupees"
                  inputMode="decimal"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.stock}
                  onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
                  placeholder="Opening stock"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <input
                  value={productForm.description}
                  onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Short description"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.lowStockThreshold}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, lowStockThreshold: event.target.value }))
                  }
                  placeholder="Low stock"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <button
                onClick={() => void createProduct()}
                disabled={formBusy === "product"}
                className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
              >
                {formBusy === "product" ? "Creating..." : "Add product"}
              </button>
              {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
              {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
            </div>
            <div className="mt-5 grid gap-3">
              {productsState.error ? (
                <ErrorNotice message={productsState.error} />
              ) : productsState.loading && inventory.length === 0 ? (
                <EmptyState
                  title="Loading inventory"
                  description="Pulling product availability and stock thresholds."
                />
              ) : inventory.length ? (
                inventory.slice(0, 6).map((product) => (
                  <div
                    key={product.id}
                    className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatEnumLabel(product.category)} · {formatInr(product.pricePaise)}
                        </p>
                      </div>
                      <StatusPill
                        value={`${product.stock} left`}
                        tone={product.stock <= product.lowStockThreshold ? "amber" : "blue"}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Inventory is clear"
                  description="No products have been created for this organization yet."
                />
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Queue health"
              title="Shop posture"
              description="A quick operational read on how shop traffic is moving right now."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Stock scope",
                  value: branchScope.inventoryScope === "ORG_WIDE" ? "Org-wide" : selectedBranchName,
                  meta: "Branch-level stock is a later multi-branch enhancement",
                },
                {
                  label: "Pending payment",
                  value: formatCompactNumber(queuedOrders.length),
                  meta: "Orders still waiting to settle",
                },
                {
                  label: "Ready for pickup",
                  value: formatCompactNumber(readyOrders.length),
                  meta: "Desk should keep pickup codes handy",
                },
                {
                  label: "Revenue today",
                  value: formatInr(summary.revenuePaise),
                  meta: "Shared with membership revenue card",
                },
              ]}
            />
          </GlassCard>
        </div>
      </div>
    );
  }

  if (mode === "staff") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard>
          <div className="mb-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Invite staff</p>
                <p className="mt-1 text-xs text-white/45">Adds a real role assignment for this gym.</p>
              </div>
              <Pill tone="lime">Invite</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={staffInvite.email}
                onChange={(event) => setStaffInvite((current) => ({ ...current, email: event.target.value }))}
                placeholder="staff@example.com"
                type="email"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <select
                value={staffInvite.role}
                onChange={(event) =>
                  setStaffInvite((current) => ({
                    ...current,
                    role: event.target.value as typeof staffInvite.role,
                  }))
                }
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="TRAINER" className="bg-black">Trainer</option>
                <option value="RECEPTIONIST" className="bg-black">Receptionist</option>
                <option value="ADMIN" className="bg-black">Admin</option>
              </select>
            </div>
            <button
              onClick={() => void inviteStaff()}
              disabled={formBusy === "staff"}
              className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {formBusy === "staff" ? "Inviting..." : "Invite staff"}
            </button>
            {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
            {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
          </div>
          <SectionHeader
            eyebrow="Team"
            title="Operational roles"
            description="This shows all non-member role assignments in the organization so ownership can verify who can act on sensitive surfaces."
            badge={<Pill tone="blue">{staffAssignments.length} assignments</Pill>}
          />
          <div className="mt-5">
            {staffState.error ? (
              <ErrorNotice message={staffState.error} />
            ) : staffState.loading && staffAssignments.length === 0 ? (
              <EmptyState
                title="Loading staff"
                description="Pulling role assignments for this organization."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "person",
                    header: "Person",
                    render: (assignment) => (
                      <div>
                        <p className="font-medium text-white">
                          {staffUsersById.get(assignment.userId)?.name ?? "Staff user"}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          {staffUsersById.get(assignment.userId)?.email ?? assignment.userId}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "role",
                    header: "Role",
                    render: (assignment) => (
                      <StatusPill value={formatEnumLabel(assignment.role)} tone="blue" />
                    ),
                  },
                  {
                    id: "contact",
                    header: "Contact",
                    render: (assignment) =>
                      staffUsersById.get(assignment.userId)?.phone ??
                      organization.contactPhone ??
                      "Desk route",
                  },
                  {
                    id: "created",
                    header: "Assigned",
                    render: (assignment) => formatDate(assignment.createdAt),
                  },
                ]}
                rows={staffAssignments}
                rowKey={(assignment) => assignment.id}
                empty="No staff assignments are recorded beyond members."
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Coach Output"
            title="Plan production"
            description="Trainer-authored and AI-assisted plans surface here so owners can sanity-check the delivery load."
            badge={
              <Pill tone="amber">
                {coachPlans.filter((plan) => plan.aiGenerated).length} AI assisted
              </Pill>
            }
          />
          <div className="mt-5 grid gap-3">
            {coachPlansState.error ? (
              <ErrorNotice message={coachPlansState.error} />
            ) : coachPlansState.loading && coachPlans.length === 0 ? (
              <EmptyState
                title="Loading coaching plans"
                description="Pulling the current training library."
              />
            ) : coachPlans.length ? (
              coachPlans.slice(0, 6).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{plan.title}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatEnumLabel(plan.type)} · {plan.assignmentCount} assignments
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(plan.status)} />
                      {plan.aiGenerated ? <StatusPill value="AI" tone="amber" /> : null}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-white/40">
                    Updated {formatDateTime(plan.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No coaching plans yet"
                description="Trainers have not published any plans for this org."
              />
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (mode === "plans") {
    return (
      <div className="grid gap-4">
        <GlassCard>
          <SectionHeader
            eyebrow="Commercial Plans"
            title="Membership catalog"
            description="The commercial ladder below drives public join, approvals, and manual sales paths."
            badge={<Pill tone="blue">{membershipPlans.length} offers</Pill>}
          />
          <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Create membership plan</p>
                <p className="mt-1 text-xs text-white/45">Publishes into join, sales, and approval flows.</p>
              </div>
              <Pill tone="lime">Live</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={planForm.name}
                onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Plan name"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <select
                value={planForm.type}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    type: event.target.value as typeof planForm.type,
                  }))
                }
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                {["HYBRID", "DURATION", "VISIT_PACK", "DATE_RANGE", "TRIAL"].map((type) => (
                  <option key={type} value={type} className="bg-black">
                    {formatEnumLabel(type)}
                  </option>
                ))}
              </select>
              <input
                value={planForm.priceRupees}
                onChange={(event) => setPlanForm((current) => ({ ...current, priceRupees: event.target.value }))}
                placeholder="Price in rupees"
                inputMode="decimal"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={planForm.durationDays}
                onChange={(event) => setPlanForm((current) => ({ ...current, durationDays: event.target.value }))}
                placeholder="Duration days"
                inputMode="numeric"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={planForm.visitLimit}
                onChange={(event) => setPlanForm((current) => ({ ...current, visitLimit: event.target.value }))}
                placeholder="Visit limit"
                inputMode="numeric"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                Public
                <input
                  type="checkbox"
                  checked={planForm.publicVisible}
                  onChange={(event) =>
                    setPlanForm((current) => ({ ...current, publicVisible: event.target.checked }))
                  }
                  className="h-4 w-4 accent-lime-300"
                />
              </label>
            </div>
            <input
              value={planForm.description}
              onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short public description"
              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              onClick={() => void createMembershipPlan()}
              disabled={formBusy === "plan"}
              className="zook-focus w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {formBusy === "plan" ? "Creating..." : "Create plan"}
            </button>
            {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
            {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
          </div>
          <div className="mt-5">
            {membershipPlansState.error ? (
              <ErrorNotice message={membershipPlansState.error} />
            ) : membershipPlansState.loading && membershipPlans.length === 0 ? (
              <EmptyState
                title="Loading membership offers"
                description="Pulling live plan definitions from the org route."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "name",
                    header: "Plan",
                    render: (plan) => (
                      <div>
                        <p className="font-medium text-white">{plan.name}</p>
                        <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                      </div>
                    ),
                  },
                  {
                    id: "shape",
                    header: "Structure",
                    render: (plan) => formatPlanShape(plan),
                  },
                  {
                    id: "visibility",
                    header: "Visibility",
                    render: (plan) => (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          value={plan.publicVisible ? "Public" : "Private"}
                          tone={plan.publicVisible ? "blue" : "neutral"}
                        />
                        <StatusPill
                          value={plan.active ? "Active" : "Paused"}
                          tone={plan.active ? "lime" : "amber"}
                        />
                      </div>
                    ),
                  },
                  {
                    id: "price",
                    header: "Price",
                    align: "right",
                    render: (plan) => (
                      <span className="font-medium text-white">{formatInr(plan.pricePaise)}</span>
                    ),
                  },
                ]}
                rows={membershipPlans}
                rowKey={(plan) => plan.id}
                empty="No membership plans are available yet."
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Coaching Library"
            title="Workout and advisory plans"
            description="These are the plans trainers and AI flows are creating inside the organization."
            badge={
              <Pill tone="amber">
                {coachPlans.filter((plan) => plan.reviewed === false).length} pending review
              </Pill>
            }
          />
          <div className="mt-5">
            {coachPlansState.error ? (
              <ErrorNotice message={coachPlansState.error} />
            ) : coachPlansState.loading && coachPlans.length === 0 ? (
              <EmptyState
                title="Loading coaching library"
                description="Pulling draft and published plan content."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "title",
                    header: "Plan",
                    render: (plan) => (
                      <div>
                        <p className="font-medium text-white">{plan.title}</p>
                        <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                      </div>
                    ),
                  },
                  {
                    id: "review",
                    header: "Review",
                    render: (plan) => (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          value={plan.reviewed ? "Reviewed" : "Needs review"}
                          tone={plan.reviewed ? "lime" : "amber"}
                        />
                        {plan.aiGenerated ? <StatusPill value="AI assisted" tone="amber" /> : null}
                      </div>
                    ),
                  },
                  {
                    id: "assignment",
                    header: "Assignments",
                    align: "right",
                    render: (plan) => plan.assignmentCount.toString(),
                  },
                  {
                    id: "updated",
                    header: "Updated",
                    render: (plan) => formatDateTime(plan.updatedAt),
                  },
                ]}
                rows={coachPlans}
                rowKey={(plan) => plan.id}
                empty="No workout or advisory plans are available yet."
              />
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (mode === "payments") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GlassCard variant="strong">
            <p className="text-sm text-white/48">Manual / offline</p>
            <div className="metric mt-3 text-4xl font-semibold text-white">
              {formatInr(summary.cashCollectedPaise)}
            </div>
            <p className="mt-2 text-xs text-white/55">Collected today via desk-recorded flows.</p>
          </GlassCard>
          <GlassCard variant="strong">
            <p className="text-sm text-white/48">Successful revenue</p>
            <div className="metric mt-3 text-4xl font-semibold text-white">
              {formatInr(summary.revenuePaise)}
            </div>
            <p className="mt-2 text-xs text-white/55">Current settled revenue signal for today.</p>
          </GlassCard>
          <GlassCard variant="strong">
            <p className="text-sm text-white/48">Pending shop payments</p>
            <div className="metric mt-3 text-4xl font-semibold text-white">
              {formatCompactNumber(queuedOrders.length)}
            </div>
            <p className="mt-2 text-xs text-white/55">
              Orders waiting for payment completion or desk follow-up.
            </p>
          </GlassCard>
          <GlassCard variant="strong">
            <p className="text-sm text-white/48">Expiring memberships</p>
            <div className="metric mt-3 text-4xl font-semibold text-white">
              {formatCompactNumber(summary.expiringMemberships)}
            </div>
            <p className="mt-2 text-xs text-white/55">A useful renewal queue for the front desk.</p>
          </GlassCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <GlassCard>
            <SectionHeader
              eyebrow="Settlement Queue"
              title="Orders affecting cashflow"
              description="Shop orders are the clearest current payment queue exposed to the dashboard. This keeps desk staff anchored on what still needs attention."
              badge={
                <Pill tone={queuedOrders.length ? "amber" : "lime"}>
                  {queuedOrders.length} unsettled
                </Pill>
              }
            />
            <div className="mt-5">
              {shopOrdersState.error ? (
                <ErrorNotice message={shopOrdersState.error} />
              ) : shopOrdersState.loading && shopOrders.length === 0 ? (
                <EmptyState
                  title="Loading settlement queue"
                  description="Pulling live shop order payment states."
                />
              ) : (
                <DataTable
                  columns={[
                    {
                      id: "order",
                      header: "Order",
                      render: (order) => (
                        <div>
                          <p className="font-medium text-white">
                            {order.id.slice(-8).toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "status",
                      header: "Status",
                      render: (order) => <StatusPill value={formatEnumLabel(order.status)} />,
                    },
                    {
                      id: "items",
                      header: "Items",
                      align: "right",
                      render: (order) =>
                        order.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
                    },
                    {
                      id: "amount",
                      header: "Amount",
                      align: "right",
                      render: (order) => (
                        <span className="font-medium text-white">
                          {formatInr(order.totalPaise)}
                        </span>
                      ),
                    },
                  ]}
                  rows={shopOrders}
                  rowKey={(order) => order.id}
                  empty="No payment-linked shop orders are available."
                />
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Levers"
              title="Revenue levers"
              description="The org already exposes the main pressure points: renewals, low stock, and queue-heavy notifications."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Renewal window",
                  value: formatCompactNumber(summary.expiringMemberships),
                  meta: "Members expiring in the next 7 days",
                },
                {
                  label: "Inventory pressure",
                  value: formatCompactNumber(summary.lowStockProducts),
                  meta: "Products close to threshold",
                },
                {
                  label: "Notification queue",
                  value: formatCompactNumber(summary.notificationQueueCount),
                  meta: "Messages still scheduled or failed",
                },
                {
                  label: "Plan ladder",
                  value: membershipPlans.length
                    ? `${membershipPlans.length} live plans`
                    : "Load plans",
                  meta: "Useful while talking renewals at the desk",
                },
              ]}
            />
          </GlassCard>
        </div>
      </div>
    );
  }

  if (mode === "reports") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Daily Rollup"
            title="Operational report pack"
            description="This is a readout-friendly version of the org summary so owners can scan memberships, floor activity, and revenue in one pass."
          />
          <ReadoutGrid
            className="mt-5"
            columns={2}
            items={[
              {
                label: "Branch scope",
                value: selectedBranchName,
                meta: "Attendance and memberships are branch-filterable",
              },
              {
                label: "Active members",
                value: formatCompactNumber(summary.activeMembers),
                meta: `${summary.joinRequests} join requests pending`,
              },
              {
                label: "Attendance today",
                value: formatCompactNumber(summary.todayAttendance),
                meta: "QR scans with entry codes",
              },
              {
                label: "Revenue today",
                value: formatInr(summary.revenuePaise),
                meta: `${formatInr(summary.cashCollectedPaise)} manual or offline`,
              },
              {
                label: "AI usage",
                value: formatCompactNumber(summary.aiUsageThisMonth),
                meta: "This month",
              },
              {
                label: "Low stock",
                value: formatCompactNumber(summary.lowStockProducts),
                meta: "Products below threshold",
              },
              {
                label: "Trial runway",
                value: formatDaysRemaining(summary.trialDaysRemaining),
                meta: formatDate(organization.trialEndAt),
              },
            ]}
          />
        </GlassCard>

        <div className="grid gap-4">
          <GlassCard>
            <SectionHeader
              eyebrow="Governance"
              title="Control posture"
              description="These signals tell you whether the org is operating cleanly or building up hidden risk."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Audit trail",
                  value: formatCompactNumber(auditLogCount),
                  meta: "Privileged actions persisted in the log",
                },
                {
                  label: "Notification queue",
                  value:
                    summary.notificationQueueCount > 0
                      ? `${summary.notificationQueueCount} needs attention`
                      : "Clear",
                  meta: "Scheduled or failed messages",
                },
                {
                  label: "Join mode",
                  value: formatEnumLabel(organization.joinMode),
                  meta: "Shapes how inbound demand converts",
                },
              ]}
            />
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Operator Notes"
              title="What deserves a second look"
              description="The dashboard is strongest when operators keep using these sections as handoff tools instead of separate spreadsheets."
            />
            <div className="mt-5 grid gap-3">
              {[
                "Cross-check expiring memberships with the membership ladder before the evening rush.",
                "If flagged attendance exceptions spike, send an operational notification before it becomes member-visible.",
                "Use the audit and AI surfaces together when policy-sensitive trainer or member actions happen.",
              ].map((note) => (
                <div
                  key={note}
                  className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/58"
                >
                  {note}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (mode === "audit") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Audit"
            title="Privileged action trail"
            description="These rows come from the org audit log and help explain who changed sensitive state and when."
            badge={<Pill tone="blue">{auditLogs.length || auditLogCount} entries</Pill>}
          />
          <div className="mt-5">
            {auditLogsState.error ? (
              <ErrorNotice message={auditLogsState.error} />
            ) : auditLogsState.loading && auditLogs.length === 0 ? (
              <EmptyState
                title="Loading audit trail"
                description="Pulling the latest privileged-action log."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "action",
                    header: "Action",
                    render: (log) => (
                      <div>
                        <p className="font-medium text-white">{formatEnumLabel(log.action)}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {formatEnumLabel(log.entityType)}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "actor",
                    header: "Actor",
                    render: (log) => log.actorUserId ?? "System",
                  },
                  {
                    id: "entity",
                    header: "Entity",
                    render: (log) => log.entityId ?? "Not attached",
                  },
                  {
                    id: "time",
                    header: "Created",
                    render: (log) => formatDateTime(log.createdAt),
                  },
                ]}
                rows={auditLogs}
                rowKey={(log) => log.id}
                empty="No audit entries are available yet."
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="AI Oversight"
            title="Recent AI usage"
            description="Review AI output alongside the audit trail when staff are drafting or publishing member-facing plans."
            badge={
              <Pill tone={misconfiguredAiCount > 0 ? "amber" : "lime"}>
                {misconfiguredAiCount} flagged
              </Pill>
            }
          />
          <div className="mt-5 grid gap-3">
            {aiUsageState.error ? (
              <ErrorNotice message={aiUsageState.error} />
            ) : aiUsageState.loading && aiUsage.length === 0 ? (
              <EmptyState
                title="Loading AI activity"
                description="Pulling the latest usage logs for this org."
              />
            ) : aiUsage.length ? (
              aiUsage.slice(0, 8).map((usage) => (
                <div
                  key={usage.id}
                  className="rounded-[22px] border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-white">{usage.promptSummary}</p>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill value={formatEnumLabel(usage.provider)} tone="blue" />
                      <StatusPill value={formatEnumLabel(usage.requestType)} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-white/55">
                    {usage.responseSummary ?? "Response summary not captured."}
                  </p>
                  <p className="mt-3 text-xs text-white/40">
                    {formatEnumLabel(usage.role)} · {usage.tokenEstimate} tokens ·{" "}
                    {formatInr(usage.costEstimatePaise)} · {formatDateTime(usage.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No AI activity yet"
                description="AI usage logs will appear here once drafting or safety flows run."
              />
            )}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="AI Usage"
            title="Model traffic and summaries"
            description="This is the live org-level AI feed, including request types, prompt summaries, and estimated spend."
            badge={<Pill tone="blue">{aiUsage.length} events</Pill>}
          />
          <div className="mt-5">
            {aiUsageState.error ? (
              <ErrorNotice message={aiUsageState.error} />
            ) : aiUsageState.loading && aiUsage.length === 0 ? (
              <EmptyState
                title="Loading AI surface"
                description="Pulling the latest usage signals for this organization."
              />
            ) : (
              <DataTable
                columns={[
                  {
                    id: "summary",
                    header: "Prompt",
                    render: (usage) => (
                      <div>
                        <p className="font-medium text-white">{usage.promptSummary}</p>
                        <p className="mt-1 text-xs text-white/45">
                          {usage.responseSummary ?? "No response summary"}
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "shape",
                    header: "Shape",
                    render: (usage) => (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill value={formatEnumLabel(usage.provider)} tone="blue" />
                        <StatusPill value={formatEnumLabel(usage.requestType)} />
                      </div>
                    ),
                  },
                  {
                    id: "tokens",
                    header: "Tokens",
                    align: "right",
                    render: (usage) => usage.tokenEstimate.toString(),
                  },
                  {
                    id: "cost",
                    header: "Cost",
                    align: "right",
                    render: (usage) => formatInr(usage.costEstimatePaise),
                  },
                ]}
                rows={aiUsage}
                rowKey={(usage) => usage.id}
                empty="No AI events are available for this organization yet."
              />
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Plan Yield"
            title="AI-assisted content output"
            description="A quick view of whether AI use is staying tied to real, reviewable coaching output."
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Usage this month",
                value: formatCompactNumber(summary.aiUsageThisMonth),
                meta: "Captured in the org summary",
              },
              {
                label: "Safety cues",
                value:
                  misconfiguredAiCount > 0 ? `${misconfiguredAiCount} prompts flagged` : "Clear",
                meta: "Based on usage safety metadata",
              },
              {
                label: "AI-assisted plans",
                value: coachPlans.filter((plan) => plan.aiGenerated).length
                  ? `${coachPlans.filter((plan) => plan.aiGenerated).length} plans`
                  : "No AI plans yet",
                meta: "Reviewable training content created so far",
              },
            ]}
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Today"
            title="Daily command grid"
            description="A compact, read-first rollup for owners and desk operators. The goal is to show what needs action before you start drilling into individual sections."
            badge={<StatusPill value={formatEnumLabel(organization.status)} />}
            action={
              <Link
                href="/dashboard/reports"
                className="zook-focus inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:bg-white/10"
              >
                Open reports
              </Link>
            }
          />
          <ReadoutGrid
            className="mt-5"
            columns={3}
            items={[
              {
                label: "Active members",
                value: formatCompactNumber(summary.activeMembers),
                meta: `${summary.joinRequests} inbound requests`,
              },
              {
                label: "Attendance today",
                value: formatCompactNumber(summary.todayAttendance),
                meta: "QR scans with entry codes",
              },
              {
                label: "Revenue",
                value: formatInr(summary.revenuePaise),
                meta: `${formatInr(summary.cashCollectedPaise)} manual / offline`,
              },
              {
                label: "Low stock",
                value: formatCompactNumber(summary.lowStockProducts),
                meta: "Pickup inventory risk",
              },
              {
                label: "Notification queue",
                value:
                  summary.notificationQueueCount > 0
                    ? `${summary.notificationQueueCount} waiting`
                    : "Clear",
                meta: "Failed or scheduled sends",
              },
              {
                label: "Trial runway",
                value: formatDaysRemaining(summary.trialDaysRemaining),
                meta: formatDate(organization.trialEndAt),
              },
            ]}
          />
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Next Up"
            title="Shift watchlist"
            description="Fast paths into the surfaces that usually need attention first."
          />
          <div className="mt-5 grid gap-3">
            {overviewWorkflowCards.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/6"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{item.label}</p>
                  <Pill tone={item.tone}>{item.detail}</Pill>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Growth"
            title="Referral and discount controls"
            description="Owner-managed referral links can grant member discounts while trainer/admin/member sharing stays permissioned."
            badge={<Pill tone="lime">Owner managed</Pill>}
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Referral links",
                value: "Enabled by owner",
                meta: "Toggle discounts through coupon and referral settings",
              },
              {
                label: "Share permissions",
                value: "Role controlled",
                meta: "Trainer/admin/member referral abilities follow permissions",
              },
              {
                label: "Cult-style path",
                value: "Friend discount + reward",
                meta: "Track discount, referrer, and redemption count",
              },
            ]}
          />
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Signals"
            title="Recent AI and message activity"
            description="A shared snapshot of automation output and member communication coming from this org."
          />
          <div className="mt-5 grid gap-3">
            {initialAiUsage.slice(0, 3).map((usage) => (
              <div key={usage.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{usage.promptSummary}</p>
                  <div className="flex gap-2">
                    <StatusPill value={formatEnumLabel(usage.provider)} tone="blue" />
                    <StatusPill value={formatEnumLabel(usage.requestType)} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/45">{formatDateTime(usage.createdAt)}</p>
              </div>
            ))}
            {!initialAiUsage.length ? (
              <EmptyState
                title="No AI activity in the current snapshot"
                description="This org has not created AI usage logs yet, so the surface stays quiet until drafting or safety flows run."
              />
            ) : null}
            {initialNotifications.slice(0, 2).map((notification) => (
              <div
                key={notification.id}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{notification.title}</p>
                  <StatusPill value={formatEnumLabel(notification.status)} />
                </div>
                <p className="mt-2 text-xs text-white/45">
                  {formatEnumLabel(notification.type)} · {formatDateTime(notification.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Inventory and Governance"
            title="Edges worth watching"
            description="The point here is to surface quiet operational risk before it spills into member experience."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                Low-stock products
              </p>
              <div className="mt-4 grid gap-3">
                {initialProducts.length ? (
                  initialProducts.slice(0, 4).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        <p className="text-xs text-white/45">
                          {formatInr(product.pricePaise ?? 0)}
                        </p>
                      </div>
                      <StatusPill
                        value={`${product.stock ?? 0} left`}
                        tone={
                          (product.stock ?? 0) <= (product.lowStockThreshold ?? 0)
                            ? "amber"
                            : "blue"
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-white/48">
                    No low-stock products in the current snapshot.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
                Control posture
              </p>
              <ReadoutGrid
                className="mt-4"
                columns={1}
                items={[
                  {
                    label: "Audit trail",
                    value: formatCompactNumber(auditLogCount),
                    meta: "Privileged action history",
                  },
                  {
                    label: "Join mode",
                    value: formatEnumLabel(organization.joinMode),
                    meta: `${organization.city}${organization.state ? `, ${organization.state}` : ""}`,
                  },
                  {
                    label: "Contact lane",
                    value: organization.contactEmail ?? organization.contactPhone ?? "Desk-owned",
                    meta: "Primary escalation route",
                  },
                ]}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
