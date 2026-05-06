"use client";

import { formatBranchName } from "@zook/core";
import { type PillTone } from "../../glass-card";
import {
  countFlags,
  type AIUsageRow,
  type AttendanceRecordRow,
  type AuditLogRow,
  type BranchRow,
  type BranchScopeSnapshot,
  type CoachPlanRow,
  type CouponRow,
  type JoinRequestRow,
  type MemberDetailPayload,
  type MemberRow,
  type MembershipPlanRow,
  type OfferRow,
  type OrganizationSummary,
  type PaymentRow,
  type ProductRow,
  type ReferralAnalyticsPayload,
  type ReferralCodeRow,
  type ReferralPolicyRow,
  type ShopOrderRow,
  type StaffAssignmentRow,
  type StaffUserRow,
} from "../../dashboard-operational-model";
import {
  useOperationalResource,
  usePagedOperationalResource,
} from "@/lib/use-operational-resource";

export function useDashboardOperationalResources({
  orgId,
  mode,
  selectedMemberId,
  initialJoinRequests,
  initialAiUsage,
  summary,
  branchScope,
}: {
  orgId: string;
  mode: string;
  selectedMemberId: string | null;
  initialJoinRequests: JoinRequestRow[];
  initialAiUsage: AIUsageRow[];
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
}) {
  const membersState = usePagedOperationalResource<
    { members: MemberRow[]; nextCursor?: string | null; limit: number },
    MemberRow
  >({
    path: `/api/orgs/${orgId}/members?limit=50`,
    enabled: mode === "members",
    itemKey: "members",
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
      enabled: mode === "staff" || mode === "branches",
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
  const paymentsState = usePagedOperationalResource<
    { payments: PaymentRow[]; nextCursor?: string | null; limit: number },
    PaymentRow
  >({
    path: `/api/orgs/${orgId}/payments?limit=50`,
    enabled: mode === "payments",
    itemKey: "payments",
  });
  const attendanceState = usePagedOperationalResource<
    { attendance: AttendanceRecordRow[]; nextCursor?: string | null; limit: number },
    AttendanceRecordRow
  >({
    path: `/api/orgs/${orgId}/attendance?limit=50`,
    enabled: mode === "attendance",
    itemKey: "attendance",
  });
  const auditLogsState = usePagedOperationalResource<
    { auditLogs: AuditLogRow[]; nextCursor?: string | null; limit: number },
    AuditLogRow
  >({
    path: `/api/orgs/${orgId}/audit-logs?limit=100`,
    enabled: mode === "audit",
    itemKey: "auditLogs",
  });
  const aiUsageState = useOperationalResource<{ usage: AIUsageRow[] }>({
    path: `/api/orgs/${orgId}/ai/usage`,
    enabled: mode === "audit" || mode === "ai",
    ...(mode === "audit" || mode === "ai" ? { initialData: { usage: initialAiUsage } } : {}),
  });
  const couponsState = useOperationalResource<{ coupons: CouponRow[] }>({
    path: `/api/orgs/${orgId}/coupons`,
    enabled: mode === "overview" || mode === "payments",
  });
  const offersState = useOperationalResource<{ offers: OfferRow[] }>({
    path: `/api/orgs/${orgId}/offers`,
    enabled: mode === "overview" || mode === "plans" || mode === "payments",
  });
  const branchesState = useOperationalResource<{ branches: BranchRow[] }>({
    path: `/api/orgs/${orgId}/branches`,
    enabled: mode === "overview" || mode === "staff" || mode === "branches",
  });
  const referralPolicyState = useOperationalResource<{ policy: ReferralPolicyRow }>({
    path: `/api/orgs/${orgId}/referral-policy`,
    enabled: mode === "overview",
  });
  const referralsState = useOperationalResource<{
    referrals: ReferralCodeRow[];
    users: StaffUserRow[];
    coupons: CouponRow[];
  }>({
    path: `/api/orgs/${orgId}/referrals`,
    enabled: mode === "overview",
  });
  const referralAnalyticsState = useOperationalResource<ReferralAnalyticsPayload>({
    path: `/api/orgs/${orgId}/referral-analytics`,
    enabled: mode === "overview",
  });
  const memberDetailState = useOperationalResource<MemberDetailPayload>({
    path: selectedMemberId ? `/api/orgs/${orgId}/members/${selectedMemberId}` : undefined,
    enabled: Boolean(selectedMemberId),
  });

  const membershipPlans = membershipPlansState.data?.plans ?? [];
  const members = membersState.items;
  const joinRequests = joinRequestsState.data?.joinRequests ?? initialJoinRequests;
  const staffAssignments = staffState.data?.staff ?? [];
  const staffUsers = staffState.data?.users ?? [];
  const coachPlans = coachPlansState.data?.plans ?? [];
  const inventory = productsState.data?.products ?? [];
  const shopOrders = shopOrdersState.data?.orders ?? [];
  const payments = paymentsState.items;
  const attendanceRecords = attendanceState.items;
  const auditLogs = auditLogsState.items;
  const aiUsage = aiUsageState.data?.usage ?? initialAiUsage;
  const coupons = couponsState.data?.coupons ?? [];
  const offers = offersState.data?.offers ?? [];
  const branches = branchesState.data?.branches ?? [];
  const referralPolicy = referralPolicyState.data?.policy ?? null;
  const referrals = referralsState.data?.referrals ?? [];
  const referralAnalytics = referralAnalyticsState.data;
  const referralUsersById = new Map(
    (referralsState.data?.users ?? []).map((user) => [user.id, user]),
  );
  const selectedBranchName = formatBranchName(
    branchScope.selectedBranch ?? branchScope.branches[0],
  );
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
      label: "Review assistant drafts",
      href: "/dashboard/ai",
      detail: `${summary.aiUsageThisMonth} drafts this month`,
      tone: summary.aiUsageThisMonth > 0 ? "blue" : "neutral",
    },
  ];

  return {
    membersState,
    joinRequestsState,
    membershipPlansState,
    staffState,
    coachPlansState,
    productsState,
    shopOrdersState,
    paymentsState,
    attendanceState,
    auditLogsState,
    aiUsageState,
    couponsState,
    offersState,
    branchesState,
    referralPolicyState,
    referralsState,
    referralAnalyticsState,
    memberDetailState,
    membershipPlans,
    members,
    joinRequests,
    staffAssignments,
    staffUsers,
    coachPlans,
    inventory,
    shopOrders,
    payments,
    attendanceRecords,
    auditLogs,
    aiUsage,
    coupons,
    offers,
    branches,
    referralPolicy,
    referrals,
    referralAnalytics,
    referralUsersById,
    selectedBranchName,
    planNamesById,
    staffUsersById,
    queuedOrders,
    readyOrders,
    misconfiguredAiCount,
    overviewWorkflowCards,
  };
}

export type DashboardOperationalResources = ReturnType<typeof useDashboardOperationalResources>;
