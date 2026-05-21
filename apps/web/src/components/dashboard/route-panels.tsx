"use client";

import {
  AiPanel,
  AttendancePanel,
  AuditPanel,
  NotificationsPanel,
  PaymentsPanel,
  ReportsPanel,
} from "./read-only-panels";
import { BranchesSection } from "./sections/branches-section";
import { ShopSection } from "./shop/section";
import { MembersPage } from "./members/members-page";
import { StaffSection } from "./sections/staff-section";
import {
  BillingSection,
  RefundsSection,
  SettingsSection,
} from "./sections/utility-sections";
import {
  CouponsRouteSection,
  OffersRouteSection,
  PlansSection,
  ReferralsRouteSection,
} from "./plans";
import { GymProfileSetupPanel } from "../gym-profile-setup-panel";
import {
  type DashboardOperationalPanelProps,
  useDashboardOperationalController,
} from "./operational/use-dashboard-operational-controller";
import type { DashboardOperationalMode } from "./operational/controller-types";

export type DashboardRoutePanelBaseProps = Omit<
  DashboardOperationalPanelProps,
  "mode" | "shopView"
>;

function DashboardPanelContent(props: DashboardOperationalPanelProps) {
  const controller = useDashboardOperationalController(props);
  const {
    orgId,
    mode,
    shopView = "products",
    organization,
    summary,
    branchScope,
    auditLogCount,
    initialNotifications,
    roles = [],
    permissions = [],
  } = props;
  const {
    queueBusyId,
    queueError,
    planForm,
    setPlanForm,
    planEditForm,
    setPlanEditForm,
    editingPlanId,
    setEditingPlanId,
    productForm,
    setProductForm,
    productEditForm,
    setProductEditForm,
    editingProductId,
    setEditingProductId,
    stockAdjustment,
    setStockAdjustment,
    editingStaffId,
    setEditingStaffId,
    staffRoleDraft,
    setStaffRoleDraft,
    staffBranchDraft,
    setStaffBranchDraft,
    staffInvite,
    setStaffInvite,
    branchForm,
    setBranchForm,
    editingBranchId,
    setEditingBranchId,
    branchEditForm,
    setBranchEditForm,
    selectedMemberId,
    setSelectedMemberId,
    formStatus,
    formError,
    formBusy,
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
    branchesState,
    memberDetailState,
    membershipPlans,
    members,
    joinRequests,
    staffAssignments,
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
    referrals,
    selectedBranchName,
    planNamesById,
    staffUsersById,
    queuedOrders,
    readyOrders,
    misconfiguredAiCount,
    updateJoinRequest,
    createMembershipPlan,
    createProduct,
    startPlanEdit,
    updateMembershipPlan,
    deleteMembershipPlan,
    startProductEdit,
    updateProduct,
    adjustStock,
    deleteProduct,
    inviteStaff,
    updateStaffRole,
    revokeStaff,
    deleteCoachPlan,
    createBranch,
    updateBranch,
    startBranchEdit,
    saveBranchEdit,
    deactivateBranch,
  } = controller;

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
        roles={roles}
        permissions={permissions}
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
      <MembersPage
        view={mode === "join-requests" ? "join-requests" : "members"}
        orgId={orgId}
        organization={organization}
        members={members}
        membersState={membersState}
        selectedMemberId={selectedMemberId}
        setSelectedMemberId={setSelectedMemberId}
        memberDetailState={memberDetailState}
        joinRequests={joinRequests}
        joinRequestsState={joinRequestsState}
        queueError={queueError}
        queueBusyId={queueBusyId}
        updateJoinRequest={updateJoinRequest}
        membershipPlans={membershipPlans}
        membershipPlansState={membershipPlansState}
        planNamesById={planNamesById}
      />
    );
  }

  if (mode === "shop") {
    return (
      <ShopSection
        view={shopView}
        orgId={orgId}
        summary={summary}
        branchScope={branchScope}
        selectedBranchName={selectedBranchName}
        inventory={inventory}
        shopOrders={shopOrders}
        queuedOrders={queuedOrders}
        readyOrders={readyOrders}
        productsState={productsState}
        shopOrdersState={shopOrdersState}
        productForm={productForm}
        setProductForm={setProductForm}
        productEditForm={productEditForm}
        setProductEditForm={setProductEditForm}
        editingProductId={editingProductId}
        setEditingProductId={setEditingProductId}
        stockAdjustment={stockAdjustment}
        setStockAdjustment={setStockAdjustment}
        formError={formError}
        formStatus={formStatus}
        formBusy={formBusy}
        createProduct={createProduct}
        startProductEdit={startProductEdit}
        updateProduct={updateProduct}
        adjustStock={adjustStock}
        deleteProduct={deleteProduct}
      />
    );
  }

  if (mode === "staff") {
    return (
      <StaffSection
        organization={organization}
        staffInvite={staffInvite}
        setStaffInvite={setStaffInvite}
        staffAssignments={staffAssignments}
        staffUsersById={staffUsersById}
        staffState={staffState}
        editingStaffId={editingStaffId}
        setEditingStaffId={setEditingStaffId}
        staffRoleDraft={staffRoleDraft}
        setStaffRoleDraft={setStaffRoleDraft}
        staffBranchDraft={staffBranchDraft}
        setStaffBranchDraft={setStaffBranchDraft}
        branches={branches}
        coachPlans={coachPlans}
        coachPlansState={coachPlansState}
        formError={formError}
        formStatus={formStatus}
        formBusy={formBusy}
        inviteStaff={inviteStaff}
        updateStaffRole={updateStaffRole}
        revokeStaff={revokeStaff}
        deleteCoachPlan={deleteCoachPlan}
      />
    );
  }

  if (mode === "plan-coupons") {
    return <CouponsRouteSection {...controller} />;
  }

  if (mode === "plan-offers") {
    return <OffersRouteSection {...controller} />;
  }

  if (mode === "plan-referrals") {
    return <ReferralsRouteSection {...controller} />;
  }

  if (mode === "plans") {
    return (
      <PlansSection
        membershipPlans={membershipPlans}
        membershipPlansState={membershipPlansState}
        coachPlans={coachPlans}
        coachPlansState={coachPlansState}
        activeCouponCount={coupons.filter((coupon) => coupon.active).length}
        activeOfferCount={offers.filter((offer) => offer.active).length}
        referralCodeCount={referrals.length}
        planForm={planForm}
        setPlanForm={setPlanForm}
        planEditForm={planEditForm}
        setPlanEditForm={setPlanEditForm}
        editingPlanId={editingPlanId}
        setEditingPlanId={setEditingPlanId}
        formError={formError}
        formStatus={formStatus}
        formBusy={formBusy}
        createMembershipPlan={createMembershipPlan}
        startPlanEdit={startPlanEdit}
        updateMembershipPlan={updateMembershipPlan}
        deleteMembershipPlan={deleteMembershipPlan}
      />
    );
  }

  if (mode === "branches") {
    return (
      <BranchesSection
        branches={branches}
        branchesState={branchesState}
        branchForm={branchForm}
        setBranchForm={setBranchForm}
        branchEditForm={branchEditForm}
        setBranchEditForm={setBranchEditForm}
        editingBranchId={editingBranchId}
        setEditingBranchId={setEditingBranchId}
        staffAssignments={staffAssignments}
        staffUsersById={staffUsersById}
        membershipPlans={membershipPlans}
        formError={formError}
        formStatus={formStatus}
        formBusy={formBusy}
        createBranch={createBranch}
        saveBranchEdit={saveBranchEdit}
        startBranchEdit={startBranchEdit}
        updateBranch={updateBranch}
        deactivateBranch={deactivateBranch}
      />
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
        permissions={permissions}
      />
    );
  }

  if (mode === "payment-refunds") {
    return <RefundsSection payments={payments} onRefundSubmitted={paymentsState.reload} />;
  }

  if (mode === "billing") {
    return <BillingSection orgId={orgId} organization={organization} summary={summary} />;
  }

  if (mode === "settings") {
    return <SettingsSection organization={organization} />;
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

  return null;
}

function withMode(
  props: DashboardRoutePanelBaseProps,
  mode: DashboardOperationalMode,
  options?: Pick<DashboardOperationalPanelProps, "shopView">,
) {
  return <DashboardPanelContent {...props} mode={mode} {...options} />;
}

export function PublicProfileDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "public-profile");
}

export function SettingsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "settings");
}

export function MembersDashboardRoute(
  props: DashboardRoutePanelBaseProps & { view: "members" | "join-requests" },
) {
  return withMode(props, props.view === "join-requests" ? "join-requests" : "members");
}

export function AttendanceDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "attendance");
}

export function NotificationsDashboardRoute(
  props: DashboardRoutePanelBaseProps & { view: "compose" | "templates" | "history" },
) {
  const mode =
    props.view === "templates"
      ? "notification-templates"
      : props.view === "history"
        ? "notification-history"
        : "notifications";
  return withMode(props, mode);
}

export function ReportsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "reports");
}

export function ShopDashboardRoute(
  props: DashboardRoutePanelBaseProps & { view: "products" | "orders" },
) {
  return withMode(props, "shop", { shopView: props.view });
}

export function StaffDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "staff");
}

export function PlanCouponsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "plan-coupons");
}

export function PlanOffersDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "plan-offers");
}

export function PlanReferralsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "plan-referrals");
}

export function PlansDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "plans");
}

export function BillingDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "billing");
}

export function PaymentRefundsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "payment-refunds");
}

export function PaymentsDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "payments");
}

export function BranchesDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "branches");
}

export function AuditDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "audit");
}

export function AiDashboardRoute(props: DashboardRoutePanelBaseProps) {
  return withMode(props, "ai");
}
