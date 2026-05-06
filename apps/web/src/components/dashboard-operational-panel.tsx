"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBranchName } from "@zook/core";
import { BodyCompositionTimeline } from "./dashboard/body-composition-timeline";
import {
  AiPanel,
  AttendancePanel,
  AuditPanel,
  NotificationsPanel,
  PaymentsPanel,
  ReportsPanel,
} from "./dashboard/read-only-panels";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "./dashboard/operational-shared";
import {
  DataTable,
  EmptyState,
  ReadoutGrid,
  SectionHeader,
  StatusPill,
} from "./dashboard-primitives";
import { GlassCard, Pill, type PillTone } from "./glass-card";
import { GymProfileSetupPanel } from "./gym-profile-setup-panel";
import {
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatDaysRemaining,
  formatEnumLabel,
  formatInr,
} from "@/lib/format";
import { useOperationalResource, usePagedOperationalResource } from "@/lib/use-operational-resource";
import { webApiFetch } from "@/lib/api-client";

import {
  countFlags,
  formatPlanShape,
  resolveMode,
  type AIUsageRow,
  type AttendanceRecordRow,
  type AuditLogRow,
  type BranchRow,
  type BranchScopeSnapshot,
  type CoachPlanRow,
  type CouponKind,
  type CouponRow,
  type DiscountType,
  type JoinRequestRow,
  type MemberDetailPayload,
  type MemberRow,
  type MembershipPlanRow,
  type MembershipPlanType,
  type NotificationSnapshot,
  type OfferRow,
  type OrganizationSnapshot,
  type OrganizationSummary,
  type PaymentRow,
  type ProductCategory,
  type ProductRow,
  type ProductSnapshot,
  type ReferralAnalyticsPayload,
  type ReferralCodeRow,
  type ReferralPolicyRow,
  type RewardType,
  type ShopOrderRow,
  type StaffAssignmentRow,
  type StaffRole,
  type StaffUserRow,
} from "./dashboard-operational-model";

type BranchFormState = {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  managerId?: string;
  amenitiesText?: string;
  hoursText?: string;
  isDefault?: boolean;
  active?: boolean;
};

function branchFormPayload(form: BranchFormState) {
  let operatingHours: unknown;
  if (form.hoursText?.trim()) {
    operatingHours = JSON.parse(form.hoursText);
  }
  return {
    name: form.name,
    address: form.address,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    contactPhone: form.contactPhone?.trim() || undefined,
    contactEmail: form.contactEmail?.trim() || undefined,
    whatsappNumber: form.whatsappNumber?.trim() || undefined,
    managerId: form.managerId?.trim() || undefined,
    amenities: form.amenitiesText
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    ...(operatingHours ? { operatingHours } : {}),
    isDefault: form.isDefault,
    active: form.active,
  };
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
  const emptyPlanForm = {
    name: "",
    type: "HYBRID" as MembershipPlanType,
    priceRupees: "",
    durationDays: "",
    visitLimit: "",
    description: "",
    publicVisible: true,
    active: true,
  };
  const emptyProductForm = {
    name: "",
    category: "OTHER" as ProductCategory,
    priceRupees: "",
    stock: "",
    lowStockThreshold: "5",
    description: "",
    active: true,
  };
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [planEditForm, setPlanEditForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productEditForm, setProductEditForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ productId: "", delta: "", reason: "" });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffRoleDraft, setStaffRoleDraft] = useState<StaffRole>("TRAINER");
  const [staffBranchDraft, setStaffBranchDraft] = useState("");
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "PERCENTAGE" as CouponKind,
    value: "1000",
    maxRedemptions: "",
    perUserLimit: "1",
    applicablePlanId: "",
  });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponEditForm, setCouponEditForm] = useState(couponForm);
  const [offerForm, setOfferForm] = useState({
    name: "",
    discountType: "PERCENTAGE" as CouponKind,
    discountValue: "1500",
    applicablePlanId: "",
    endsInDays: "30",
    stackable: true,
  });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditForm, setOfferEditForm] = useState(offerForm);
  const [referralForm, setReferralForm] = useState({
    code: "",
    couponId: "",
    maxUses: "20",
    createdByRole: "MEMBER" as "OWNER" | "ADMIN" | "RECEPTIONIST" | "TRAINER" | "MEMBER",
  });
  const [policyForm, setPolicyForm] = useState({
    enabled: true,
    referrerRewardType: "DAYS" as RewardType,
    referrerRewardValue: "7",
    referredDiscountType: "PERCENTAGE" as DiscountType,
    referredDiscountValue: "1000",
    maxDiscountCapBps: "3000",
    maxReferralsPerMonth: "5",
    referralCodeExpiryDays: "90",
    trainerReferralEnabled: true,
    staffReferralEnabled: false,
  });
  const [staffInvite, setStaffInvite] = useState({
    email: "",
    role: "TRAINER" as StaffRole,
  });
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    city: organization.city ?? "",
    state: organization.state ?? "",
    pincode: "",
    contactPhone: "",
    contactEmail: "",
    whatsappNumber: "",
    managerId: "",
    amenitiesText: "",
    hoursText: "",
    isDefault: false,
  });
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchEditForm, setBranchEditForm] = useState(branchForm);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState<string | null>(null);

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

  useEffect(() => {
    if (!referralPolicy) return;
    setPolicyForm({
      enabled: referralPolicy.enabled,
      referrerRewardType: referralPolicy.referrerRewardType,
      referrerRewardValue: referralPolicy.referrerRewardValue.toString(),
      referredDiscountType: referralPolicy.referredDiscountType,
      referredDiscountValue: referralPolicy.referredDiscountValue.toString(),
      maxDiscountCapBps: referralPolicy.maxDiscountCapBps.toString(),
      maxReferralsPerMonth: referralPolicy.maxReferralsPerMonth.toString(),
      referralCodeExpiryDays: referralPolicy.referralCodeExpiryDays.toString(),
      trainerReferralEnabled: referralPolicy.trainerReferralEnabled,
      staffReferralEnabled: referralPolicy.staffReferralEnabled,
    });
  }, [referralPolicy]);

  function payloadForPlanForm(form: typeof planForm) {
    return {
      name: form.name,
      description: form.description || undefined,
      type: form.type,
      pricePaise: Math.round(Number(form.priceRupees || 0) * 100),
      durationDays: form.durationDays ? Number(form.durationDays) : undefined,
      visitLimit: form.visitLimit ? Number(form.visitLimit) : undefined,
      validityDays: form.durationDays ? Number(form.durationDays) : undefined,
      publicVisible: form.publicVisible,
      active: form.active,
    };
  }

  function validatePlanName(value: string) {
    const trimmed = value.trim();
    if (trimmed.length > 60) {
      return "Plan name must be 60 characters or fewer.";
    }
    if (/\d{8,}/.test(trimmed)) {
      return "Plan name cannot include raw numeric IDs.";
    }
    return "";
  }

  function payloadForProductForm(form: typeof productForm) {
    return {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      pricePaise: Math.round(Number(form.priceRupees || 0) * 100),
      stock: Number(form.stock || 0),
      lowStockThreshold: Number(form.lowStockThreshold || 0),
      active: form.active,
    };
  }

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
      const planNameError = validatePlanName(planForm.name);
      if (planNameError) {
        setFormError(planNameError);
        return;
      }
      setFormBusy("plan");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans`, {
        method: "POST",
        body: payloadForPlanForm(planForm),
      });
      setPlanForm(emptyPlanForm);
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
        body: payloadForProductForm(productForm),
      });
      setProductForm(emptyProductForm);
      productsState.reload();
      setFormStatus("Shop product created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create product.");
    } finally {
      setFormBusy(null);
    }
  }

  function startPlanEdit(plan: MembershipPlanRow) {
    setEditingPlanId(plan.id);
    setPlanEditForm({
      name: plan.name,
      type: plan.type as MembershipPlanType,
      priceRupees: (plan.pricePaise / 100).toString(),
      durationDays: plan.durationDays?.toString() ?? "",
      visitLimit: plan.visitLimit?.toString() ?? "",
      description: plan.description ?? "",
      publicVisible: plan.publicVisible,
      active: plan.active,
    });
    setFormError("");
    setFormStatus("");
  }

  async function updateMembershipPlan(
    planId: string,
    patch?: Partial<ReturnType<typeof payloadForPlanForm>>,
  ) {
    try {
      if (!patch) {
        const planNameError = validatePlanName(planEditForm.name);
        if (planNameError) {
          setFormError(planNameError);
          return;
        }
      }
      setFormBusy(`plan:${planId}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans/${planId}`, {
        method: "PATCH",
        body: patch ?? payloadForPlanForm(planEditForm),
      });
      setEditingPlanId(null);
      membershipPlansState.reload();
      setFormStatus("Membership plan updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update membership plan.");
    } finally {
      setFormBusy(null);
    }
  }

  async function deleteMembershipPlan(planId: string) {
    if (
      !window.confirm(
        "Delete this unused membership plan? Plans with subscriptions should be archived instead.",
      )
    ) {
      return;
    }
    try {
      setFormBusy(`plan:${planId}:delete`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/membership-plans/${planId}`, { method: "DELETE" });
      membershipPlansState.reload();
      setFormStatus("Membership plan deleted.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to delete membership plan.");
    } finally {
      setFormBusy(null);
    }
  }

  function startProductEdit(product: ProductRow) {
    setEditingProductId(product.id);
    setProductEditForm({
      name: product.name,
      category: product.category as ProductCategory,
      priceRupees: (product.pricePaise / 100).toString(),
      stock: product.stock.toString(),
      lowStockThreshold: product.lowStockThreshold.toString(),
      description: product.description ?? "",
      active: product.active,
    });
    setStockAdjustment({ productId: product.id, delta: "", reason: "Manual stock count" });
    setFormError("");
    setFormStatus("");
  }

  async function updateProduct(
    productId: string,
    patch?: Partial<ReturnType<typeof payloadForProductForm>>,
  ) {
    try {
      setFormBusy(`product:${productId}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products/${productId}`, {
        method: "PATCH",
        body: patch ?? payloadForProductForm(productEditForm),
      });
      setEditingProductId(null);
      productsState.reload();
      setFormStatus("Shop product updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update product.");
    } finally {
      setFormBusy(null);
    }
  }

  async function adjustStock(productId: string) {
    try {
      setFormBusy(`stock:${productId}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/inventory/adjust`, {
        method: "POST",
        body: {
          productId,
          delta: Number(stockAdjustment.delta),
          reason: stockAdjustment.reason || "Manual stock adjustment",
        },
      });
      setStockAdjustment({ productId, delta: "", reason: "Manual stock count" });
      productsState.reload();
      setFormStatus("Stock adjusted.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to adjust stock.");
    } finally {
      setFormBusy(null);
    }
  }

  async function deleteProduct(productId: string) {
    if (
      !window.confirm(
        "Delete this unused product? Products with order history should be archived instead.",
      )
    ) {
      return;
    }
    try {
      setFormBusy(`product:${productId}:delete`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/products/${productId}`, { method: "DELETE" });
      productsState.reload();
      setFormStatus("Shop product deleted.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to delete product.");
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

  async function updateStaffRole(assignmentId: string) {
    try {
      setFormBusy(`staff:${assignmentId}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/${assignmentId}`, {
        method: "PATCH",
        body: { role: staffRoleDraft, branchId: staffBranchDraft || null },
      });
      setEditingStaffId(null);
      staffState.reload();
      setFormStatus("Staff role updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update staff role.");
    } finally {
      setFormBusy(null);
    }
  }

  async function revokeStaff(assignmentId: string) {
    if (!window.confirm("Revoke this staff member's access to the gym?")) {
      return;
    }
    try {
      setFormBusy(`staff:${assignmentId}:revoke`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/staff/${assignmentId}`, { method: "DELETE" });
      staffState.reload();
      setFormStatus("Staff access revoked.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to revoke staff access.");
    } finally {
      setFormBusy(null);
    }
  }

  async function deleteCoachPlan(plan: CoachPlanRow) {
    if (
      !window.confirm(
        "Archive or delete this coaching plan? Assigned plans are archived to keep member history intact.",
      )
    ) {
      return;
    }
    try {
      setFormBusy(`coach-plan:${plan.id}:delete`);
      setFormError("");
      setFormStatus("");
      const payload = await webApiFetch<{ archived?: boolean }>(
        `/api/orgs/${orgId}/plans/${plan.id}`,
        {
          method: "DELETE",
        },
      );
      coachPlansState.reload();
      setFormStatus(payload.archived ? "Coaching plan archived." : "Coaching plan deleted.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to remove coaching plan.");
    } finally {
      setFormBusy(null);
    }
  }

  async function createBranch() {
    try {
      setFormBusy("branch");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/branches`, {
        method: "POST",
        body: branchFormPayload(branchForm),
      });
      setBranchForm({
        name: "",
        address: "",
        city: organization.city ?? "",
        state: organization.state ?? "",
        pincode: "",
        contactPhone: "",
        contactEmail: "",
        whatsappNumber: "",
        managerId: "",
        amenitiesText: "",
        hoursText: "",
        isDefault: false,
      });
      branchesState.reload();
      setFormStatus("Branch created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create branch.");
    } finally {
      setFormBusy(null);
    }
  }

  async function updateBranch(branch: BranchRow, patch: Partial<BranchRow> | BranchFormState) {
    try {
      setFormBusy(`branch:${branch.id}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/branches/${branch.id}`, {
        method: "PATCH",
        body: "amenitiesText" in patch || "hoursText" in patch ? branchFormPayload(patch as typeof branchForm) : patch,
      });
      branchesState.reload();
      setFormStatus("Branch updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update branch.");
    } finally {
      setFormBusy(null);
    }
  }

  function startBranchEdit(branch: BranchRow) {
    setEditingBranchId(branch.id);
    setBranchEditForm({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      contactPhone: branch.contactPhone ?? "",
      contactEmail: branch.contactEmail ?? "",
      whatsappNumber: branch.whatsappNumber ?? "",
      managerId: branch.managerId ?? "",
      amenitiesText: branch.amenities?.join(", ") ?? "",
      hoursText: branch.operatingHours ? JSON.stringify(branch.operatingHours) : "",
      isDefault: branch.isDefault,
    });
    setFormError("");
    setFormStatus("");
  }

  async function saveBranchEdit(branch: BranchRow) {
    await updateBranch(branch, branchEditForm);
    setEditingBranchId(null);
  }

  async function deactivateBranch(branch: BranchRow) {
    if (!window.confirm("Deactivate this branch? Existing history stays intact.")) {
      return;
    }
    try {
      setFormBusy(`branch:${branch.id}:delete`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/branches/${branch.id}`, { method: "DELETE" });
      branchesState.reload();
      setFormStatus("Branch deactivated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to deactivate branch.");
    } finally {
      setFormBusy(null);
    }
  }

  function applyBranchHoursPreset(
    target: "create" | "edit",
    preset: "standard" | "early" | "always",
  ) {
    const hours =
      preset === "always"
        ? {
            mon: { open: "00:00", close: "23:59" },
            tue: { open: "00:00", close: "23:59" },
            wed: { open: "00:00", close: "23:59" },
            thu: { open: "00:00", close: "23:59" },
            fri: { open: "00:00", close: "23:59" },
            sat: { open: "00:00", close: "23:59" },
            sun: { open: "00:00", close: "23:59" },
          }
        : {
            mon: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            tue: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            wed: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            thu: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            fri: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            sat: { open: preset === "early" ? "05:00" : "06:00", close: "22:00" },
            sun: { closed: true },
          };
    const hoursText = JSON.stringify(hours);
    if (target === "edit") {
      setBranchEditForm((current) => ({ ...current, hoursText }));
      return;
    }
    setBranchForm((current) => ({ ...current, hoursText }));
  }

  async function saveReferralPolicy() {
    try {
      setFormBusy("referral-policy");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referral-policy`, {
        method: "PATCH",
        body: {
          enabled: policyForm.enabled,
          referrerRewardType: policyForm.referrerRewardType,
          referrerRewardValue: Number(policyForm.referrerRewardValue || 0),
          referredDiscountType: policyForm.referredDiscountType,
          referredDiscountValue: Number(policyForm.referredDiscountValue || 0),
          maxDiscountCapBps: Number(policyForm.maxDiscountCapBps || 0),
          maxReferralsPerMonth: Number(policyForm.maxReferralsPerMonth || 1),
          referralCodeExpiryDays: Number(policyForm.referralCodeExpiryDays || 0),
          trainerReferralEnabled: policyForm.trainerReferralEnabled,
          staffReferralEnabled: policyForm.staffReferralEnabled,
        },
      });
      referralPolicyState.reload();
      setFormStatus("Referral policy saved.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to save referral policy.");
    } finally {
      setFormBusy(null);
    }
  }

  async function createCoupon() {
    try {
      setFormBusy("coupon");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons`, {
        method: "POST",
        body: {
          code: couponForm.code,
          type: couponForm.type,
          ...(couponForm.type === "PERCENTAGE"
            ? { valuePercentBps: Number(couponForm.value || 0) }
            : { valuePaise: Math.round(Number(couponForm.value || 0) * 100) }),
          maxRedemptions: couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : undefined,
          perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : undefined,
          applicablePlanId: couponForm.applicablePlanId || undefined,
        },
      });
      setCouponForm({
        code: "",
        type: "PERCENTAGE",
        value: "1000",
        maxRedemptions: "",
        perUserLimit: "1",
        applicablePlanId: "",
      });
      couponsState.reload();
      setFormStatus("Coupon created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create coupon.");
    } finally {
      setFormBusy(null);
    }
  }

  async function toggleCoupon(coupon: CouponRow) {
    try {
      setFormBusy(`coupon:${coupon.id}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons/${coupon.id}`, {
        method: "PATCH",
        body: { active: !coupon.active },
      });
      couponsState.reload();
      setFormStatus(coupon.active ? "Coupon deactivated." : "Coupon restored.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update coupon.");
    } finally {
      setFormBusy(null);
    }
  }

  function payloadForCouponForm(form: typeof couponForm) {
    return {
      code: form.code,
      type: form.type,
      ...(form.type === "PERCENTAGE"
        ? { valuePercentBps: Number(form.value || 0) }
        : { valuePaise: Math.round(Number(form.value || 0) * 100) }),
      ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}),
      ...(form.perUserLimit ? { perUserLimit: Number(form.perUserLimit) } : {}),
      ...(form.applicablePlanId ? { applicablePlanId: form.applicablePlanId } : {}),
    };
  }

  function startCouponEdit(coupon: CouponRow) {
    setEditingCouponId(coupon.id);
    setCouponEditForm({
      code: coupon.code,
      type: coupon.type,
      value:
        coupon.type === "PERCENTAGE"
          ? (coupon.valuePercentBps ?? 0).toString()
          : ((coupon.valuePaise ?? 0) / 100).toString(),
      maxRedemptions: coupon.maxRedemptions?.toString() ?? "",
      perUserLimit: coupon.perUserLimit?.toString() ?? "1",
      applicablePlanId: coupon.applicablePlanId ?? "",
    });
  }

  async function updateCoupon(couponId: string) {
    try {
      setFormBusy(`coupon:${couponId}:edit`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons/${couponId}`, {
        method: "PATCH",
        body: payloadForCouponForm(couponEditForm),
      });
      setEditingCouponId(null);
      couponsState.reload();
      setFormStatus("Coupon updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update coupon.");
    } finally {
      setFormBusy(null);
    }
  }

  async function createOffer() {
    try {
      setFormBusy("offer");
      setFormError("");
      setFormStatus("");
      const now = new Date();
      const endsAt = new Date(
        now.getTime() + Number(offerForm.endsInDays || 30) * 24 * 60 * 60 * 1000,
      );
      await webApiFetch(`/api/orgs/${orgId}/offers`, {
        method: "POST",
        body: {
          name: offerForm.name,
          discountType: offerForm.discountType,
          discountValue:
            offerForm.discountType === "PERCENTAGE"
              ? Number(offerForm.discountValue || 0)
              : Math.round(Number(offerForm.discountValue || 0) * 100),
          applicablePlanIds: offerForm.applicablePlanId ? [offerForm.applicablePlanId] : undefined,
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          active: true,
          stackable: offerForm.stackable,
        },
      });
      setOfferForm({
        name: "",
        discountType: "PERCENTAGE",
        discountValue: "1500",
        applicablePlanId: "",
        endsInDays: "30",
        stackable: true,
      });
      offersState.reload();
      setFormStatus("Offer created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create offer.");
    } finally {
      setFormBusy(null);
    }
  }

  async function toggleOffer(offer: OfferRow) {
    try {
      setFormBusy(`offer:${offer.id}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/offers/${offer.id}`, {
        method: "PATCH",
        body: { active: !offer.active },
      });
      offersState.reload();
      setFormStatus(offer.active ? "Offer deactivated." : "Offer restored.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update offer.");
    } finally {
      setFormBusy(null);
    }
  }

  function startOfferEdit(offer: OfferRow) {
    const firstPlanId = Array.isArray(offer.applicablePlans)
      ? String(offer.applicablePlans[0] ?? "")
      : "";
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(offer.endsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
    );
    setEditingOfferId(offer.id);
    setOfferEditForm({
      name: offer.name,
      discountType: offer.discountType,
      discountValue:
        offer.discountType === "PERCENTAGE"
          ? offer.discountValue.toString()
          : (offer.discountValue / 100).toString(),
      applicablePlanId: firstPlanId,
      endsInDays: daysLeft.toString(),
      stackable: offer.stackable,
    });
  }

  async function updateOffer(offerId: string) {
    try {
      setFormBusy(`offer:${offerId}:edit`);
      setFormError("");
      setFormStatus("");
      const now = new Date();
      const endsAt = new Date(
        now.getTime() + Number(offerEditForm.endsInDays || 30) * 24 * 60 * 60 * 1000,
      );
      await webApiFetch(`/api/orgs/${orgId}/offers/${offerId}`, {
        method: "PATCH",
        body: {
          name: offerEditForm.name,
          discountType: offerEditForm.discountType,
          discountValue:
            offerEditForm.discountType === "PERCENTAGE"
              ? Number(offerEditForm.discountValue || 0)
              : Math.round(Number(offerEditForm.discountValue || 0) * 100),
          applicablePlanIds: offerEditForm.applicablePlanId ? [offerEditForm.applicablePlanId] : [],
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          stackable: offerEditForm.stackable,
        },
      });
      setEditingOfferId(null);
      offersState.reload();
      setFormStatus("Offer updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update offer.");
    } finally {
      setFormBusy(null);
    }
  }

  async function createReferral() {
    try {
      setFormBusy("referral");
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referrals`, {
        method: "POST",
        body: {
          code: referralForm.code || undefined,
          couponId: referralForm.couponId || undefined,
          maxUses: referralForm.maxUses ? Number(referralForm.maxUses) : undefined,
          createdByRole: referralForm.createdByRole,
        },
      });
      setReferralForm({ code: "", couponId: "", maxUses: "20", createdByRole: "MEMBER" });
      referralsState.reload();
      setFormStatus("Referral code created.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to create referral code.");
    } finally {
      setFormBusy(null);
    }
  }

  async function updateReferral(
    referral: ReferralCodeRow,
    status: "active" | "paused" | "expired",
  ) {
    try {
      setFormBusy(`referral:${referral.id}`);
      setFormError("");
      setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referrals/${referral.id}`, {
        method: "PATCH",
        body: { status },
      });
      referralsState.reload();
      setFormStatus("Referral code updated.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Unable to update referral code.");
    } finally {
      setFormBusy(null);
    }
  }

  if (mode === "public-profile") {
    return <GymProfileSetupPanel orgId={orgId} />;
  }

  if (mode === "attendance") {
    return (
      <AttendancePanel
        orgId={orgId}
        organization={organization}
        summary={summary}
        branchScope={branchScope}
        selectedBranchName={selectedBranchName}
        attendanceRecords={attendanceRecords}
        attendanceState={attendanceState}
      />
    );
  }

  if (
    mode === "notifications" ||
    mode === "notification-templates" ||
    mode === "notification-history"
  ) {
    return (
      <NotificationsPanel
        orgId={orgId}
        organization={organization}
        summary={summary}
        initialNotifications={initialNotifications}
        view={
          mode === "notification-templates"
            ? "templates"
            : mode === "notification-history"
              ? "history"
              : "compose"
        }
      />
    );
  }

  if (mode === "members" || mode === "join-requests") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="xl:col-span-1">
            <SectionHeader
              eyebrow="Members"
              title="Member roster"
              description="Profiles come from the member directory."
              badge={<Pill tone="lime">{members.length} profiles</Pill>}
              action={<CsvExportButton href={`/api/orgs/${orgId}/reports/members.csv`} />}
            />
            {selectedMemberId ? (
              <div className="mt-4 rounded-[22px] border border-lime-200/15 bg-lime-200/8 p-4">
                {memberDetailState.error ? (
                  <ErrorNotice message={memberDetailState.error} />
                ) : memberDetailState.loading || !memberDetailState.data ? (
                  <p className="text-sm text-white/55">Loading member detail...</p>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Member</p>
                      <p className="mt-2 font-medium text-white">
                        {memberDetailState.data.member.user?.name ?? "Member"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {memberDetailState.data.member.user?.email ?? "No email"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                        Subscription
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        {memberDetailState.data.member.subscriptions[0]?.plan?.name ?? "No plan"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {memberDetailState.data.member.subscriptions[0]
                          ? formatEnumLabel(memberDetailState.data.member.subscriptions[0].status)
                          : "No subscription"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Activity</p>
                      <p className="mt-2 text-sm text-white/70">
                        {memberDetailState.data.member.attendance.length} recent check-ins
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {memberDetailState.data.member.workouts.length} trainer-visible workouts
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/35">Payments</p>
                      <p className="mt-2 text-sm text-white/70">
                        {memberDetailState.data.member.payments.length} recent records
                      </p>
                      <button
                        onClick={() => setSelectedMemberId(null)}
                        className="zook-focus mt-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
                      >
                        Close
                      </button>
                    </div>
                    <BodyCompositionTimeline
                      entries={memberDetailState.data.member.bodyProgress ?? []}
                    />
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-5">
              {membersState.error ? (
                <ErrorNotice message={membersState.error} />
              ) : membersState.loading && members.length === 0 ? (
                <EmptyState
                  title="Loading member roster"
                  description="Pulling the latest organization member list."
                />
              ) : (
                <>
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
                    {
                      id: "detail",
                      header: "Detail",
                      align: "right",
                      render: (row) => (
                        <button
                          onClick={() => row.user?.id && setSelectedMemberId(row.user.id)}
                          disabled={!row.user?.id}
                          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 hover:bg-white/8 disabled:opacity-40"
                        >
                          View
                        </button>
                      ),
                    },
                    ]}
                    rows={members}
                    rowKey={(row) => row.profile.id}
                    empty={
                      <EmptyState
                        title="No members yet"
                        description="Create your first membership plan and share your join link to start accepting members."
                        action={
                          <Link
                            href="/dashboard/membership-plans"
                            className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black"
                          >
                            Create a plan
                          </Link>
                        }
                      />
                    }
                  />
                  <LoadMoreButton
                    count={members.length}
                    hasMore={membersState.hasMore}
                    loading={membersState.loadingMore}
                    onLoadMore={membersState.loadMore}
                  />
                </>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Pipeline"
              title="Join request queue"
              description="Approval-required requests appear here so owners can approve or reject memberships before payment."
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
            eyebrow="Membership setup"
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
            description="Orders ready for payment or pickup."
            badge={
              <Pill tone={readyOrders.length ? "amber" : "lime"}>{readyOrders.length} ready</Pill>
            }
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
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
              description="Inventory is sorted by stock so the team can spot refill needs."
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
                  <p className="mt-1 text-xs text-white/45">Adds a new product to your shop.</p>
                </div>
                <Pill tone="blue">Create</Pill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, name: event.target.value }))
                  }
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
                  {["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"].map(
                    (category) => (
                      <option key={category} value={category} className="bg-black">
                        {formatEnumLabel(category)}
                      </option>
                    ),
                  )}
                </select>
                <input
                  value={productForm.priceRupees}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, priceRupees: event.target.value }))
                  }
                  placeholder="Price in rupees"
                  inputMode="decimal"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, stock: event.target.value }))
                  }
                  placeholder="Opening stock"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <input
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Short description"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={productForm.lowStockThreshold}
                  onChange={(event) =>
                    setProductForm((current) => ({
                      ...current,
                      lowStockThreshold: event.target.value,
                    }))
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
                          {formatEnumLabel(product.category)} · {formatInr(product.pricePaise)} ·{" "}
                          {product.active ? "Active" : "Archived"}
                        </p>
                      </div>
                      <span
                        className={
                          product.stock <= product.lowStockThreshold
                            ? "text-sm font-medium text-amber-100"
                            : "text-sm font-medium text-white/60"
                        }
                      >
                        {product.stock} left
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => startProductEdit(product)}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void updateProduct(product.id, { active: !product.active })}
                        disabled={formBusy === `product:${product.id}`}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-amber-300/40 hover:text-amber-100 disabled:opacity-50"
                      >
                        {product.active ? "Archive" : "Restore"}
                      </button>
                      <button
                        onClick={() => void deleteProduct(product.id)}
                        disabled={formBusy === `product:${product.id}:delete`}
                        className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Inventory is clear"
                  description="No products have been created for this organization yet."
                />
              )}
              {editingProductId ? (
                <div className="rounded-[24px] border border-lime-300/20 bg-lime-300/6 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">Edit shop product</p>
                      <p className="mt-1 text-xs text-white/45">
                        Update catalog details or apply a stock correction.
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingProductId(null)}
                      className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      value={productEditForm.name}
                      onChange={(event) =>
                        setProductEditForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Product name"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <select
                      value={productEditForm.category}
                      onChange={(event) =>
                        setProductEditForm((current) => ({
                          ...current,
                          category: event.target.value as ProductCategory,
                        }))
                      }
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      {["WATER", "PROTEIN_SHAKE", "SHAKER", "TOWEL", "SUPPLEMENT", "OTHER"].map(
                        (category) => (
                          <option key={category} value={category} className="bg-black">
                            {formatEnumLabel(category)}
                          </option>
                        ),
                      )}
                    </select>
                    <input
                      value={productEditForm.priceRupees}
                      onChange={(event) =>
                        setProductEditForm((current) => ({
                          ...current,
                          priceRupees: event.target.value,
                        }))
                      }
                      placeholder="Price in rupees"
                      inputMode="decimal"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={productEditForm.stock}
                      onChange={(event) =>
                        setProductEditForm((current) => ({ ...current, stock: event.target.value }))
                      }
                      placeholder="Current stock"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={productEditForm.lowStockThreshold}
                      onChange={(event) =>
                        setProductEditForm((current) => ({
                          ...current,
                          lowStockThreshold: event.target.value,
                        }))
                      }
                      placeholder="Low stock threshold"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                      Active
                      <input
                        type="checkbox"
                        checked={productEditForm.active}
                        onChange={(event) =>
                          setProductEditForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-lime-300"
                      />
                    </label>
                  </div>
                  <input
                    value={productEditForm.description}
                    onChange={(event) =>
                      setProductEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short description"
                    className="zook-focus mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
                    <input
                      value={
                        stockAdjustment.productId === editingProductId ? stockAdjustment.delta : ""
                      }
                      onChange={(event) =>
                        setStockAdjustment((current) => ({
                          ...current,
                          productId: editingProductId,
                          delta: event.target.value,
                        }))
                      }
                      placeholder="+/- stock"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={
                        stockAdjustment.productId === editingProductId ? stockAdjustment.reason : ""
                      }
                      onChange={(event) =>
                        setStockAdjustment((current) => ({
                          ...current,
                          productId: editingProductId,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Adjustment reason"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => void adjustStock(editingProductId)}
                      disabled={formBusy === `stock:${editingProductId}` || !stockAdjustment.delta}
                      className="zook-focus rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Adjust
                    </button>
                  </div>
                  <button
                    onClick={() => void updateProduct(editingProductId)}
                    disabled={formBusy === `product:${editingProductId}`}
                    className="zook-focus mt-3 w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {formBusy === `product:${editingProductId}` ? "Saving..." : "Save product"}
                  </button>
                </div>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard>
            <SectionHeader
              eyebrow="Queue health"
              title="Shop status"
              description="A quick operational read on how shop traffic is moving right now."
            />
            <ReadoutGrid
              className="mt-5"
              columns={1}
              items={[
                {
                  label: "Stock scope",
                  value:
                    branchScope.inventoryScope === "ORG_WIDE" ? "Org-wide" : selectedBranchName,
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
                <p className="mt-1 text-xs text-white/45">
                  Invites a new team member.
                </p>
              </div>
              <Pill tone="lime">Invite</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={staffInvite.email}
                onChange={(event) =>
                  setStaffInvite((current) => ({ ...current, email: event.target.value }))
                }
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
                <option value="TRAINER" className="bg-black">
                  Trainer
                </option>
                <option value="RECEPTIONIST" className="bg-black">
                  Receptionist
                </option>
                <option value="ADMIN" className="bg-black">
                  Admin
                </option>
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
            description="Your team and their roles."
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
                    render: (assignment) =>
                      editingStaffId === assignment.id ? (
                        <div className="grid min-w-[180px] gap-2">
                          <select
                            value={staffRoleDraft}
                            onChange={(event) => setStaffRoleDraft(event.target.value as StaffRole)}
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="TRAINER" className="bg-black">
                              Trainer
                            </option>
                            <option value="RECEPTIONIST" className="bg-black">
                              Receptionist
                            </option>
                            <option value="ADMIN" className="bg-black">
                              Admin
                            </option>
                          </select>
                          <select
                            value={staffBranchDraft}
                            onChange={(event) => setStaffBranchDraft(event.target.value)}
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                          >
                            <option value="" className="bg-black">
                              All branches
                            </option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id} className="bg-black">
                                {branch.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-white/72">
                          {formatEnumLabel(assignment.role)}
                        </span>
                      ),
                  },
                  {
                    id: "branch",
                    header: "Branch",
                    render: (assignment) =>
                      branches.find((branch) => branch.id === assignment.branchId)?.name ??
                      "All branches",
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
                  {
                    id: "actions",
                    header: "Manage",
                    align: "right",
                    render: (assignment) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        {editingStaffId === assignment.id ? (
                          <>
                            <button
                              onClick={() => void updateStaffRole(assignment.id)}
                              disabled={formBusy === `staff:${assignment.id}`}
                              className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingStaffId(null)}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingStaffId(assignment.id);
                              setStaffRoleDraft(assignment.role as StaffRole);
                              setStaffBranchDraft(assignment.branchId ?? "");
                            }}
                            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                          >
                            Role
                          </button>
                        )}
                        {assignment.role !== "OWNER" ? (
                          <button
                            onClick={() => void revokeStaff(assignment.id)}
                            disabled={formBusy === `staff:${assignment.id}:revoke`}
                            className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    ),
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
            description="Trainer-written and assisted plans appear here so owners can review the delivery load."
            badge={
              <Pill tone="amber">
                {coachPlans.filter((plan) => plan.aiGenerated).length} assisted
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
                      {plan.aiGenerated ? <StatusPill value="Assisted" tone="amber" /> : null}
                      <button
                        onClick={() => void deleteCoachPlan(plan)}
                        disabled={formBusy === `coach-plan:${plan.id}:delete`}
                        className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 disabled:opacity-50"
                      >
                        {plan.assignmentCount > 0 ? "Archive" : "Delete"}
                      </button>
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
            eyebrow="Membership plans"
            title="Membership catalog"
            description="Plans shown to members, staff, and desk teams."
            badge={<Pill tone="blue">{membershipPlans.length} offers</Pill>}
          />
          <div className="mt-5 grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">Create membership plan</p>
                <p className="mt-1 text-xs text-white/45">
                  Publishes into join, sales, and approval flows.
                </p>
              </div>
              <Pill tone="lime">Live</Pill>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={planForm.name}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Plan name"
                maxLength={60}
                pattern="^(?!.*\\d{8,}).{1,60}$"
                title="Use 60 characters or fewer and avoid raw numeric IDs."
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
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, priceRupees: event.target.value }))
                }
                placeholder="Price in rupees"
                inputMode="decimal"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={planForm.durationDays}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, durationDays: event.target.value }))
                }
                placeholder="Duration days"
                inputMode="numeric"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={planForm.visitLimit}
                onChange={(event) =>
                  setPlanForm((current) => ({ ...current, visitLimit: event.target.value }))
                }
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
              onChange={(event) =>
                setPlanForm((current) => ({ ...current, description: event.target.value }))
              }
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
                description="Loading your plans."
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
                  {
                    id: "actions",
                    header: "Manage",
                    align: "right",
                    render: (plan) => (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => startPlanEdit(plan)}
                          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-lime-300/40 hover:text-lime-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            void updateMembershipPlan(plan.id, { active: !plan.active })
                          }
                          disabled={formBusy === `plan:${plan.id}`}
                          className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:border-amber-300/40 hover:text-amber-100 disabled:opacity-50"
                        >
                          {plan.active ? "Archive" : "Restore"}
                        </button>
                        <button
                          onClick={() => void deleteMembershipPlan(plan.id)}
                          disabled={formBusy === `plan:${plan.id}:delete`}
                          className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs font-medium text-red-100/80 hover:border-red-300/45 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]}
                rows={membershipPlans}
                rowKey={(plan) => plan.id}
                empty="No membership plans are available yet."
              />
            )}
            {editingPlanId ? (
              <div className="mt-4 grid gap-3 rounded-[24px] border border-lime-300/20 bg-lime-300/6 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Edit membership plan</p>
                    <p className="mt-1 text-xs text-white/45">
                      Updates pricing, visibility, and plan structure immediately.
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingPlanId(null)}
                    className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/60"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={planEditForm.name}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Plan name"
                    maxLength={60}
                    pattern="^(?!.*\\d{8,}).{1,60}$"
                    title="Use 60 characters or fewer and avoid raw numeric IDs."
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <select
                    value={planEditForm.type}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({
                        ...current,
                        type: event.target.value as MembershipPlanType,
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
                    value={planEditForm.priceRupees}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({
                        ...current,
                        priceRupees: event.target.value,
                      }))
                    }
                    placeholder="Price in rupees"
                    inputMode="decimal"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={planEditForm.durationDays}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({
                        ...current,
                        durationDays: event.target.value,
                      }))
                    }
                    placeholder="Duration days"
                    inputMode="numeric"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <input
                    value={planEditForm.visitLimit}
                    onChange={(event) =>
                      setPlanEditForm((current) => ({ ...current, visitLimit: event.target.value }))
                    }
                    placeholder="Visit limit"
                    inputMode="numeric"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/55">
                    Public
                    <input
                      type="checkbox"
                      checked={planEditForm.publicVisible}
                      onChange={(event) =>
                        setPlanEditForm((current) => ({
                          ...current,
                          publicVisible: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-lime-300"
                    />
                  </label>
                </div>
                <input
                  value={planEditForm.description}
                  onChange={(event) =>
                    setPlanEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Short public description"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <button
                  onClick={() => void updateMembershipPlan(editingPlanId)}
                  disabled={formBusy === `plan:${editingPlanId}`}
                  className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                >
                  {formBusy === `plan:${editingPlanId}` ? "Saving..." : "Save plan"}
                </button>
              </div>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Coaching Library"
            title="Workout and advisory plans"
            description="These are the plans trainers are creating and reviewing for members."
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
                        {plan.aiGenerated ? <StatusPill value="Assisted" tone="amber" /> : null}
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

  if (mode === "branches") {
    const managerAssignments = staffAssignments.filter(
      (assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN",
    );
    return (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Branches"
            title="Add a branch"
            description="Set the location, contact number, manager, and working hours members should see."
            badge={<Pill tone={branches.length > 1 ? "blue" : "lime"}>{branches.length || 1} locations</Pill>}
          />
          <div className="mt-5 grid gap-3">
            {formError ? <ErrorNotice message={formError} /> : null}
            {formStatus ? (
              <p className="rounded-2xl border border-lime-300/20 bg-lime-300/10 px-4 py-3 text-sm text-lime-100">
                {formStatus}
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <input value={branchForm.name} onChange={(event) => setBranchForm((current) => ({ ...current, name: event.target.value }))} placeholder="Branch name" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.address} onChange={(event) => setBranchForm((current) => ({ ...current, address: event.target.value }))} placeholder="Full address" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.city} onChange={(event) => setBranchForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.state} onChange={(event) => setBranchForm((current) => ({ ...current, state: event.target.value }))} placeholder="State" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.pincode} onChange={(event) => setBranchForm((current) => ({ ...current, pincode: event.target.value }))} placeholder="Pincode" inputMode="numeric" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <select value={branchForm.managerId} onChange={(event) => setBranchForm((current) => ({ ...current, managerId: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                <option value="" className="bg-black">Assign a manager later</option>
                {managerAssignments.map((assignment) => (
                  <option key={assignment.userId} value={assignment.userId} className="bg-black">
                    {staffUsersById.get(assignment.userId)?.name ?? staffUsersById.get(assignment.userId)?.email ?? "Team member"}
                  </option>
                ))}
              </select>
              <input value={branchForm.contactPhone} onChange={(event) => setBranchForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Branch phone" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.contactEmail} onChange={(event) => setBranchForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Branch email" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.whatsappNumber} onChange={(event) => setBranchForm((current) => ({ ...current, whatsappNumber: event.target.value }))} placeholder="WhatsApp number" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              <input value={branchForm.amenitiesText} onChange={(event) => setBranchForm((current) => ({ ...current, amenitiesText: event.target.value }))} placeholder="Amenities, separated by commas" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-medium text-white">Working hours</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  ["standard", "6 AM - 10 PM"],
                  ["early", "5 AM - 10 PM"],
                  ["always", "Open all day"],
                ].map(([preset, label]) => (
                  <button key={preset} type="button" onClick={() => applyBranchHoursPreset("create", preset as "standard" | "early" | "always")} className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8">
                    {label}
                  </button>
                ))}
              </div>
              <input value={branchForm.hoursText} onChange={(event) => setBranchForm((current) => ({ ...current, hoursText: event.target.value }))} placeholder="Pick a preset or add custom hours" className="zook-focus mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            </div>
            <button onClick={() => void createBranch()} disabled={formBusy === "branch"} className="zook-focus min-h-11 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-60">
              {formBusy === "branch" ? "Adding..." : "Add branch"}
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Locations"
            title="Branch list"
            description="Keep addresses, managers, and active branches ready for member check-ins and staff work."
            badge={<Pill tone="blue">{branches.filter((branch) => branch.active).length} active</Pill>}
          />
          <div className="mt-5 grid gap-3">
            {branchesState.error ? <ErrorNotice message={branchesState.error} /> : null}
            {branches.map((branch) => (
              <div key={branch.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                {editingBranchId === branch.id ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input value={branchEditForm.name} onChange={(event) => setBranchEditForm((current) => ({ ...current, name: event.target.value }))} placeholder="Branch name" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <input value={branchEditForm.address} onChange={(event) => setBranchEditForm((current) => ({ ...current, address: event.target.value }))} placeholder="Full address" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <input value={branchEditForm.city} onChange={(event) => setBranchEditForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <input value={branchEditForm.state} onChange={(event) => setBranchEditForm((current) => ({ ...current, state: event.target.value }))} placeholder="State" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <input value={branchEditForm.pincode} onChange={(event) => setBranchEditForm((current) => ({ ...current, pincode: event.target.value }))} placeholder="Pincode" inputMode="numeric" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                      <select value={branchEditForm.managerId} onChange={(event) => setBranchEditForm((current) => ({ ...current, managerId: event.target.value }))} className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                        <option value="" className="bg-black">Assign a manager later</option>
                        {managerAssignments.map((assignment) => (
                          <option key={assignment.userId} value={assignment.userId} className="bg-black">
                            {staffUsersById.get(assignment.userId)?.name ?? staffUsersById.get(assignment.userId)?.email ?? "Team member"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyBranchHoursPreset("edit", "standard")} className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">6 AM - 10 PM</button>
                      <button type="button" onClick={() => applyBranchHoursPreset("edit", "early")} className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">5 AM - 10 PM</button>
                      <button type="button" onClick={() => applyBranchHoursPreset("edit", "always")} className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/70">Open all day</button>
                    </div>
                    <input value={branchEditForm.hoursText} onChange={(event) => setBranchEditForm((current) => ({ ...current, hoursText: event.target.value }))} placeholder="Pick a preset or add custom hours" className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void saveBranchEdit(branch)} disabled={formBusy === `branch:${branch.id}`} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">Save branch</button>
                      <button onClick={() => setEditingBranchId(null)} className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-medium text-white">{branch.name}</p>
                      <p className="mt-1 text-sm text-white/50">{branch.address} · {branch.city}, {branch.state} {branch.pincode}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {[branch.contactPhone, branch.contactEmail, branch.managerId ? "Manager assigned" : null].filter(Boolean).join(" · ") || "Add contact details before opening this branch"}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <StatusPill value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"} tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"} />
                      <button onClick={() => startBranchEdit(branch)} className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65">Edit</button>
                      {!branch.isDefault ? (
                        <button onClick={() => void updateBranch(branch, { isDefault: true, active: true })} disabled={formBusy === `branch:${branch.id}`} className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 disabled:opacity-50">Make default</button>
                      ) : null}
                      {!branch.isDefault && branch.active ? (
                        <button onClick={() => void deactivateBranch(branch)} disabled={formBusy === `branch:${branch.id}:delete`} className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50">Deactivate</button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!branches.length && !branchesState.loading ? (
              <EmptyState title="No branches yet" description="Add the first location to unlock branch-level attendance and stock controls." />
            ) : null}
          </div>
        </GlassCard>
      </div>
    );
  }

  if (mode === "payments") {
    return (
      <PaymentsPanel
        orgId={orgId}
        summary={summary}
        queuedOrders={queuedOrders}
        membershipPlans={membershipPlans}
        members={members}
        payments={payments}
        paymentsState={paymentsState}
        shopOrders={shopOrders}
        shopOrdersState={shopOrdersState}
      />
    );
  }

  if (mode === "reports") {
    return (
      <ReportsPanel
        organization={organization}
        summary={summary}
        selectedBranchName={selectedBranchName}
        auditLogCount={auditLogCount}
      />
    );
  }

  if (mode === "audit") {
    return (
      <AuditPanel
        orgId={orgId}
        auditLogs={auditLogs}
        auditLogsState={auditLogsState}
        auditLogCount={auditLogCount}
        aiUsage={aiUsage}
        aiUsageState={aiUsageState}
        misconfiguredAiCount={misconfiguredAiCount}
      />
    );
  }

  if (mode === "ai") {
    return (
      <AiPanel
        summary={summary}
        aiUsage={aiUsage}
        aiUsageState={aiUsageState}
        coachPlans={coachPlans}
        misconfiguredAiCount={misconfiguredAiCount}
      />
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Today"
            title="Daily command grid"
            description="Today's check-ins, revenue, stock, and member requests in one view."
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
                meta: "QR check-ins with entry codes",
              },
              {
                label: "Revenue",
                value: formatInr(summary.revenuePaise),
                meta: `${formatInr(summary.cashCollectedPaise)} collected at desk`,
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
            description="Quick links to what needs attention today."
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
            eyebrow="Branches"
            title="Location control"
            description="You have one branch by default. Add another branch when this gym expands."
            badge={
              <Pill tone={branches.length > 1 ? "blue" : "neutral"}>
                {branches.length || 1} branches
              </Pill>
            }
          />
          <div className="mt-5 grid gap-3">
            {branchesState.error ? <ErrorNotice message={branchesState.error} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={branchForm.name}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Branch name"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchForm.address}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, address: event.target.value }))
                }
                placeholder="Address"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchForm.city}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, city: event.target.value }))
                }
                placeholder="City"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchForm.state}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, state: event.target.value }))
                }
                placeholder="State"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <div className="grid grid-cols-[1fr_92px] gap-3">
                <input
                  value={branchForm.pincode}
                  onChange={(event) =>
                    setBranchForm((current) => ({ ...current, pincode: event.target.value }))
                  }
                  placeholder="Pincode"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <button
                  onClick={() => void createBranch()}
                  disabled={formBusy === "branch"}
                  className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                >
                  Add
                </button>
              </div>
              <input
                value={branchForm.contactPhone}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, contactPhone: event.target.value }))
                }
                placeholder="Branch phone"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchForm.contactEmail}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, contactEmail: event.target.value }))
                }
                placeholder="Branch email"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <input
                value={branchForm.whatsappNumber}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, whatsappNumber: event.target.value }))
                }
                placeholder="WhatsApp number"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
              <select
                value={branchForm.managerId}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, managerId: event.target.value }))
                }
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              >
                <option value="" className="bg-black">
                  No manager assigned
                </option>
                {staffAssignments
                  .filter((assignment) => assignment.role === "OWNER" || assignment.role === "ADMIN")
                  .map((assignment) => (
                    <option key={assignment.userId} value={assignment.userId} className="bg-black">
                      {staffUsersById.get(assignment.userId)?.name ??
                        staffUsersById.get(assignment.userId)?.email ??
                        "Team member"}
                    </option>
                  ))}
              </select>
              <input
                value={branchForm.amenitiesText}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, amenitiesText: event.target.value }))
                }
                placeholder="Amenities, comma separated"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
              />
              <input
                value={branchForm.hoursText}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, hoursText: event.target.value }))
                }
                placeholder="Working hours, or manage them from Branches"
                className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
              />
            </div>
            {branches.length === 0 && !branchesState.loading ? (
              <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/50">
                Branches will appear here once the location API responds.
              </p>
            ) : null}
            {branches.slice(0, 6).map((branch) => (
              <div
                key={branch.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                {editingBranchId === branch.id ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={branchEditForm.name}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Branch name"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <input
                        value={branchEditForm.address}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        placeholder="Address"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <input
                        value={branchEditForm.city}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({ ...current, city: event.target.value }))
                        }
                        placeholder="City"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <input
                        value={branchEditForm.state}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                        placeholder="State"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <div className="grid grid-cols-[1fr_100px] gap-3">
                        <input
                          value={branchEditForm.pincode}
                          onChange={(event) =>
                            setBranchEditForm((current) => ({
                              ...current,
                              pincode: event.target.value,
                            }))
                          }
                          placeholder="Pincode"
                          className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                        />
                        <button
                          onClick={() => void saveBranchEdit(branch)}
                          disabled={formBusy === `branch:${branch.id}`}
                          className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                        >
                          Save
                        </button>
                      </div>
                      <input
                        value={branchEditForm.contactPhone}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            contactPhone: event.target.value,
                          }))
                        }
                        placeholder="Branch phone"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <input
                        value={branchEditForm.contactEmail}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            contactEmail: event.target.value,
                          }))
                        }
                        placeholder="Branch email"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <input
                        value={branchEditForm.whatsappNumber}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            whatsappNumber: event.target.value,
                          }))
                        }
                        placeholder="WhatsApp number"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      />
                      <select
                        value={branchEditForm.managerId}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            managerId: event.target.value,
                          }))
                        }
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="" className="bg-black">
                          No manager assigned
                        </option>
                        {staffAssignments
                          .filter(
                            (assignment) =>
                              assignment.role === "OWNER" || assignment.role === "ADMIN",
                          )
                          .map((assignment) => (
                            <option
                              key={assignment.userId}
                              value={assignment.userId}
                              className="bg-black"
                            >
                              {staffUsersById.get(assignment.userId)?.name ??
                                staffUsersById.get(assignment.userId)?.email ??
                                "Team member"}
                            </option>
                          ))}
                      </select>
                      <input
                        value={branchEditForm.amenitiesText}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            amenitiesText: event.target.value,
                          }))
                        }
                        placeholder="Amenities, comma separated"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
                      />
                      <input
                        value={branchEditForm.hoursText}
                        onChange={(event) =>
                          setBranchEditForm((current) => ({
                            ...current,
                            hoursText: event.target.value,
                          }))
                        }
                        placeholder="Working hours, or manage them from Branches"
                        className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none md:col-span-2"
                      />
                    </div>
                    <button
                      onClick={() => setEditingBranchId(null)}
                      className="zook-focus justify-self-start rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{branch.name}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {branch.address} · {branch.city}, {branch.state} {branch.pincode}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {[branch.contactPhone, branch.contactEmail, branch.managerId ? "Manager assigned" : null]
                          .filter(Boolean)
                          .join(" · ") || "Add phone, hours, and manager before opening this branch"}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <StatusPill
                        value={branch.isDefault ? "Default" : branch.active ? "Active" : "Paused"}
                        tone={branch.isDefault ? "lime" : branch.active ? "blue" : "amber"}
                      />
                      <button
                        onClick={() => startBranchEdit(branch)}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
                      >
                        Edit
                      </button>
                      {!branch.isDefault ? (
                        <>
                          <button
                            onClick={() =>
                              void updateBranch(branch, { isDefault: true, active: true })
                            }
                            disabled={formBusy === `branch:${branch.id}`}
                            className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65 disabled:opacity-50"
                          >
                            Make default
                          </button>
                          {branch.active ? (
                            <button
                              onClick={() => void deactivateBranch(branch)}
                              disabled={formBusy === `branch:${branch.id}:delete`}
                              className="zook-focus rounded-full border border-red-300/20 px-3 py-1 text-xs text-red-100/80 disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Growth"
            title="Referral and discount controls"
            description="Configure the referral economy, attach discounts, and pause codes without leaving the command center."
            badge={
              <Pill tone={referralPolicy?.enabled === false ? "amber" : "lime"}>
                {referralPolicy?.enabled === false ? "Paused" : "Enabled"}
              </Pill>
            }
          />
          <div className="mt-5 grid gap-4">
            {referralPolicyState.error || couponsState.error || referralsState.error ? (
              <ErrorNotice
                message={
                  referralPolicyState.error ?? couponsState.error ?? referralsState.error ?? ""
                }
              />
            ) : null}
            {referralAnalyticsState.error ? (
              <ErrorNotice message={referralAnalyticsState.error} />
            ) : null}
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <ReadoutGrid
                columns={2}
                items={[
                  {
                    label: "Active codes",
                    value: formatCompactNumber(
                      referralAnalytics?.summary.activeCodes ?? referrals.length,
                    ),
                    meta: "Available to members and staff",
                  },
                  {
                    label: "Redemptions",
                    value: formatCompactNumber(
                      referralAnalytics?.summary.redemptionsThisMonth ?? 0,
                    ),
                    meta: "This month",
                  },
                  {
                    label: "Reward credits",
                    value: formatCompactNumber(
                      referralAnalytics?.summary.rewardCreditsThisMonth ?? 0,
                    ),
                    meta: "Days or visits credited",
                  },
                  {
                    label: "Applied rewards",
                    value: formatCompactNumber(
                      referralAnalytics?.summary.appliedRewardsThisMonth ?? 0,
                    ),
                    meta: "Completed this month",
                  },
                ]}
              />
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">Top referrers</p>
                <div className="mt-3 grid gap-2">
                  {(referralAnalytics?.topReferrers ?? []).length ? (
                    referralAnalytics!.topReferrers.map((item) => (
                      <div
                        key={item.code.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{item.code.code}</p>
                          <p className="text-xs text-white/45">
                            {item.user?.email ?? item.code.createdByRole} ·{" "}
                            {item.code.redemptionCount} redemptions
                          </p>
                        </div>
                        <StatusPill
                          value={item.code.status}
                          tone={item.code.status === "active" ? "lime" : "amber"}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-white/45">
                      Referral performance appears here after the first member share.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">Referral policy</p>
                  <p className="mt-1 text-xs text-white/45">
                    Cap discounts at 30% and choose what referrers earn.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-white/60">
                  Enabled
                  <input
                    type="checkbox"
                    checked={policyForm.enabled}
                    onChange={(event) =>
                      setPolicyForm((current) => ({ ...current, enabled: event.target.checked }))
                    }
                    className="h-4 w-4 accent-lime-300"
                  />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  value={policyForm.referrerRewardType}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      referrerRewardType: event.target.value as RewardType,
                    }))
                  }
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="DAYS" className="bg-black">
                    Reward days
                  </option>
                  <option value="VISITS" className="bg-black">
                    Reward visits
                  </option>
                  <option value="NONE" className="bg-black">
                    No reward
                  </option>
                </select>
                <input
                  value={policyForm.referrerRewardValue}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      referrerRewardValue: event.target.value,
                    }))
                  }
                  placeholder="Reward value"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={policyForm.maxDiscountCapBps}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      maxDiscountCapBps: event.target.value,
                    }))
                  }
                  placeholder="Max cap bps"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <select
                  value={policyForm.referredDiscountType}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      referredDiscountType: event.target.value as DiscountType,
                    }))
                  }
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                >
                  <option value="PERCENTAGE" className="bg-black">
                    Friend percentage
                  </option>
                  <option value="FIXED" className="bg-black">
                    Friend fixed
                  </option>
                  <option value="NONE" className="bg-black">
                    No friend discount
                  </option>
                </select>
                <input
                  value={policyForm.referredDiscountValue}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      referredDiscountValue: event.target.value,
                    }))
                  }
                  placeholder="Discount value"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
                <input
                  value={policyForm.maxReferralsPerMonth}
                  onChange={(event) =>
                    setPolicyForm((current) => ({
                      ...current,
                      maxReferralsPerMonth: event.target.value,
                    }))
                  }
                  placeholder="Monthly referral limit"
                  inputMode="numeric"
                  className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60">
                  Trainer codes
                  <input
                    type="checkbox"
                    checked={policyForm.trainerReferralEnabled}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        trainerReferralEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-lime-300"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/60">
                  Staff codes
                  <input
                    type="checkbox"
                    checked={policyForm.staffReferralEnabled}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        staffReferralEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-lime-300"
                  />
                </label>
                <button
                  onClick={() => void saveReferralPolicy()}
                  disabled={formBusy === "referral-policy"}
                  className="zook-focus ml-auto rounded-full bg-lime-300 px-5 py-2 text-xs font-semibold text-black disabled:opacity-60"
                >
                  {formBusy === "referral-policy" ? "Saving..." : "Save policy"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">Coupons</p>
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                    <input
                      value={couponForm.code}
                      onChange={(event) =>
                        setCouponForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="WELCOME10"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <select
                      value={couponForm.type}
                      onChange={(event) =>
                        setCouponForm((current) => ({
                          ...current,
                          type: event.target.value as CouponKind,
                        }))
                      }
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="PERCENTAGE" className="bg-black">
                        Percentage
                      </option>
                      <option value="FIXED_AMOUNT" className="bg-black">
                        Fixed amount
                      </option>
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      value={couponForm.value}
                      onChange={(event) =>
                        setCouponForm((current) => ({ ...current, value: event.target.value }))
                      }
                      placeholder={couponForm.type === "PERCENTAGE" ? "Bps, e.g. 1000" : "Rupees"}
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <input
                      value={couponForm.maxRedemptions}
                      onChange={(event) =>
                        setCouponForm((current) => ({
                          ...current,
                          maxRedemptions: event.target.value,
                        }))
                      }
                      placeholder="Max uses"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => void createCoupon()}
                      disabled={formBusy === "coupon"}
                      className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {formBusy === "coupon" ? "Creating..." : "Create"}
                    </button>
                  </div>
                  {coupons.slice(0, 4).map((coupon) => (
                    <div
                      key={coupon.id}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                    >
                      {editingCouponId === coupon.id ? (
                        <div className="grid gap-2">
                          <input
                            value={couponEditForm.code}
                            onChange={(event) =>
                              setCouponEditForm((current) => ({
                                ...current,
                                code: event.target.value.toUpperCase(),
                              }))
                            }
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                          />
                          <div className="grid grid-cols-[1fr_1fr] gap-2">
                            <select
                              value={couponEditForm.type}
                              onChange={(event) =>
                                setCouponEditForm((current) => ({
                                  ...current,
                                  type: event.target.value as CouponKind,
                                }))
                              }
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="PERCENTAGE" className="bg-black">
                                Percentage
                              </option>
                              <option value="FIXED_AMOUNT" className="bg-black">
                                Fixed
                              </option>
                            </select>
                            <input
                              value={couponEditForm.value}
                              onChange={(event) =>
                                setCouponEditForm((current) => ({
                                  ...current,
                                  value: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => void updateCoupon(coupon.id)}
                              disabled={formBusy === `coupon:${coupon.id}:edit`}
                              className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingCouponId(null)}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{coupon.code}</p>
                            <p className="text-xs text-white/45">
                              {coupon.type === "PERCENTAGE"
                                ? `${(coupon.valuePercentBps ?? 0) / 100}% off`
                                : formatInr(coupon.valuePaise ?? 0)}{" "}
                              · {coupon.active ? "Active" : "Inactive"}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => startCouponEdit(coupon)}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void toggleCoupon(coupon)}
                              disabled={formBusy === `coupon:${coupon.id}`}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
                            >
                              {coupon.active ? "Deactivate" : "Restore"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">Public offers</p>
                <div className="mt-3 grid gap-3">
                  <input
                    value={offerForm.name}
                    onChange={(event) =>
                      setOfferForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Summer special"
                    className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={offerForm.discountType}
                      onChange={(event) =>
                        setOfferForm((current) => ({
                          ...current,
                          discountType: event.target.value as CouponKind,
                        }))
                      }
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="PERCENTAGE" className="bg-black">
                        Percentage
                      </option>
                      <option value="FIXED_AMOUNT" className="bg-black">
                        Fixed amount
                      </option>
                    </select>
                    <input
                      value={offerForm.discountValue}
                      onChange={(event) =>
                        setOfferForm((current) => ({
                          ...current,
                          discountValue: event.target.value,
                        }))
                      }
                      placeholder={offerForm.discountType === "PERCENTAGE" ? "Bps" : "Rupees"}
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_92px]">
                    <select
                      value={offerForm.applicablePlanId}
                      onChange={(event) =>
                        setOfferForm((current) => ({
                          ...current,
                          applicablePlanId: event.target.value,
                        }))
                      }
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="" className="bg-black">
                        All public plans
                      </option>
                      {membershipPlans.map((plan) => (
                        <option key={plan.id} value={plan.id} className="bg-black">
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={offerForm.endsInDays}
                      onChange={(event) =>
                        setOfferForm((current) => ({ ...current, endsInDays: event.target.value }))
                      }
                      placeholder="Days"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                  <button
                    onClick={() => void createOffer()}
                    disabled={formBusy === "offer"}
                    className="zook-focus rounded-full bg-lime-300 px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {formBusy === "offer" ? "Creating..." : "Create offer"}
                  </button>
                  {offers.slice(0, 4).map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                    >
                      {editingOfferId === offer.id ? (
                        <div className="grid gap-2">
                          <input
                            value={offerEditForm.name}
                            onChange={(event) =>
                              setOfferEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                          />
                          <div className="grid grid-cols-[1fr_1fr] gap-2">
                            <select
                              value={offerEditForm.discountType}
                              onChange={(event) =>
                                setOfferEditForm((current) => ({
                                  ...current,
                                  discountType: event.target.value as CouponKind,
                                }))
                              }
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                            >
                              <option value="PERCENTAGE" className="bg-black">
                                Percentage
                              </option>
                              <option value="FIXED_AMOUNT" className="bg-black">
                                Fixed
                              </option>
                            </select>
                            <input
                              value={offerEditForm.discountValue}
                              onChange={(event) =>
                                setOfferEditForm((current) => ({
                                  ...current,
                                  discountValue: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => void updateOffer(offer.id)}
                              disabled={formBusy === `offer:${offer.id}:edit`}
                              className="zook-focus rounded-full bg-lime-300 px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOfferId(null)}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs text-white/65"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{offer.name}</p>
                            <p className="text-xs text-white/45">
                              {offer.discountType === "PERCENTAGE"
                                ? `${offer.discountValue / 100}% off`
                                : formatInr(offer.discountValue)}{" "}
                              · {offer.redemptionCount} used
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              onClick={() => startOfferEdit(offer)}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void toggleOffer(offer)}
                              disabled={formBusy === `offer:${offer.id}`}
                              className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
                            >
                              {offer.active ? "Deactivate" : "Restore"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="font-medium text-white">Referral codes</p>
                <div className="mt-3 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                    <input
                      value={referralForm.code}
                      onChange={(event) =>
                        setReferralForm((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="Optional custom code"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <select
                      value={referralForm.couponId}
                      onChange={(event) =>
                        setReferralForm((current) => ({ ...current, couponId: event.target.value }))
                      }
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="" className="bg-black">
                        No coupon
                      </option>
                      {coupons
                        .filter((coupon) => coupon.active)
                        .map((coupon) => (
                          <option key={coupon.id} value={coupon.id} className="bg-black">
                            {coupon.code}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      value={referralForm.maxUses}
                      onChange={(event) =>
                        setReferralForm((current) => ({ ...current, maxUses: event.target.value }))
                      }
                      placeholder="Max uses"
                      inputMode="numeric"
                      className="zook-focus rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => void createReferral()}
                      disabled={formBusy === "referral"}
                      className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {formBusy === "referral" ? "Creating..." : "Create code"}
                    </button>
                  </div>
                  {referrals.slice(0, 4).map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{referral.code}</p>
                        <p className="text-xs text-white/45">
                          {referralUsersById.get(referral.referrerUserId)?.email ??
                            referral.createdByRole}{" "}
                          · {referral.redemptionCount}/{referral.maxUses ?? "∞"} used ·{" "}
                          {referral.status}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          void updateReferral(
                            referral,
                            referral.status === "active" ? "paused" : "active",
                          )
                        }
                        disabled={formBusy === `referral:${referral.id}`}
                        className="zook-focus rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/65 disabled:opacity-50"
                      >
                        {referral.status === "active" ? "Pause" : "Restore"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {formError ? <p className="text-sm text-red-200">{formError}</p> : null}
            {formStatus ? <p className="text-sm text-lime-100">{formStatus}</p> : null}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Signals"
            title="Recent drafts and messages"
            description="A shared snapshot of assisted drafts and member communication."
          />
          <div className="mt-5 grid gap-3">
            {initialAiUsage.slice(0, 3).map((usage) => (
              <div key={usage.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{usage.promptSummary}</p>
                  <div className="flex gap-2">
                    <StatusPill value={formatEnumLabel(usage.requestType)} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-white/45">{formatDateTime(usage.createdAt)}</p>
              </div>
            ))}
            {!initialAiUsage.length ? (
              <EmptyState
                title="No assistant activity in the current view"
                description="This gym has not created assisted drafts yet."
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
            description="These checks show quiet operational risk before members feel it."
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
                Control status
              </p>
              <ReadoutGrid
                className="mt-4"
                columns={1}
                items={[
                  {
                    label: "Audit log",
                    value: formatCompactNumber(auditLogCount),
                    meta: "Admin action history",
                  },
                  {
                    label: "Join mode",
                    value: formatEnumLabel(organization.joinMode),
                    meta: `${organization.city}${organization.state ? `, ${organization.state}` : ""}`,
                  },
                  {
                    label: "Primary contact",
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
