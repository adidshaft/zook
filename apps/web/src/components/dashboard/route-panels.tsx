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
import { BillingSection } from "./sections/billing-section";
import { RefundsSection } from "./sections/refunds-section";
import { SettingsSection } from "./sections/settings-section";
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

const REGISTRY: Record<
  string,
  (props: DashboardOperationalPanelProps, controller: any) => React.ReactNode
> = {
  "public-profile": (props) => <GymProfileSetupPanel orgId={props.orgId} />,
  attendance: (props, c) => (
    <AttendancePanel
      orgId={props.orgId}
      organization={props.organization}
      summary={props.summary}
      branchScope={props.branchScope}
      selectedBranchName={c.selectedBranchName}
      attendanceRecords={c.attendanceRecords}
      attendanceState={c.attendanceState}
    />
  ),
  notifications: (props) => (
    <NotificationsPanel
      orgId={props.orgId}
      summary={props.summary}
      initialNotifications={props.initialNotifications}
      permissions={props.permissions ?? []}
      view="compose"
    />
  ),
  "notification-templates": (props) => (
    <NotificationsPanel
      orgId={props.orgId}
      summary={props.summary}
      initialNotifications={props.initialNotifications}
      permissions={props.permissions ?? []}
      view="templates"
    />
  ),
  "notification-history": (props) => (
    <NotificationsPanel
      orgId={props.orgId}
      summary={props.summary}
      initialNotifications={props.initialNotifications}
      permissions={props.permissions ?? []}
      view="history"
    />
  ),
  members: (props, c) => (
    <MembersPage
      view="members"
      orgId={props.orgId}
      organization={props.organization}
      members={c.members}
      membersState={c.membersState}
      selectedMemberId={c.selectedMemberId}
      setSelectedMemberId={c.setSelectedMemberId}
      memberDetailState={c.memberDetailState}
      joinRequests={c.joinRequests}
      joinRequestsState={c.joinRequestsState}
      queueError={c.queueError}
      queueBusyId={c.queueBusyId}
      updateJoinRequest={c.updateJoinRequest}
      membershipPlans={c.membershipPlans}
      membershipPlansState={c.membershipPlansState}
      planNamesById={c.planNamesById}
    />
  ),
  "join-requests": (props, c) => (
    <MembersPage
      view="join-requests"
      orgId={props.orgId}
      organization={props.organization}
      members={c.members}
      membersState={c.membersState}
      selectedMemberId={c.selectedMemberId}
      setSelectedMemberId={c.setSelectedMemberId}
      memberDetailState={c.memberDetailState}
      joinRequests={c.joinRequests}
      joinRequestsState={c.joinRequestsState}
      queueError={c.queueError}
      queueBusyId={c.queueBusyId}
      updateJoinRequest={c.updateJoinRequest}
      membershipPlans={c.membershipPlans}
      membershipPlansState={c.membershipPlansState}
      planNamesById={c.planNamesById}
    />
  ),
  shop: (props, c) => (
    <ShopSection
      view={props.shopView ?? "products"}
      orgId={props.orgId}
      summary={props.summary}
      branchScope={props.branchScope}
      selectedBranchName={c.selectedBranchName}
      inventory={c.inventory}
      shopOrders={c.shopOrders}
      queuedOrders={c.queuedOrders}
      readyOrders={c.readyOrders}
      productsState={c.productsState}
      shopOrdersState={c.shopOrdersState}
      productForm={c.productForm}
      setProductForm={c.setProductForm}
      productEditForm={c.productEditForm}
      setProductEditForm={c.setProductEditForm}
      editingProductId={c.editingProductId}
      setEditingProductId={c.setEditingProductId}
      stockAdjustment={c.stockAdjustment}
      setStockAdjustment={c.setStockAdjustment}
      formError={c.formError}
      formStatus={c.formStatus}
      formBusy={c.formBusy}
      createProduct={c.createProduct}
      startProductEdit={c.startProductEdit}
      updateProduct={c.updateProduct}
      adjustStock={c.adjustStock}
      deleteProduct={c.deleteProduct}
    />
  ),
  staff: (props, c) => (
    <StaffSection
      organization={props.organization}
      staffInvite={c.staffInvite}
      setStaffInvite={c.setStaffInvite}
      staffAssignments={c.staffAssignments}
      staffUsersById={c.staffUsersById}
      staffState={c.staffState}
      editingStaffId={c.editingStaffId}
      setEditingStaffId={c.setEditingStaffId}
      staffRoleDraft={c.staffRoleDraft}
      setStaffRoleDraft={c.setStaffRoleDraft}
      staffBranchDraft={c.staffBranchDraft}
      setStaffBranchDraft={c.setStaffBranchDraft}
      branches={c.branches}
      coachPlans={c.coachPlans}
      coachPlansState={c.coachPlansState}
      formError={c.formError}
      formStatus={c.formStatus}
      formBusy={c.formBusy}
      inviteStaff={c.inviteStaff}
      updateStaffRole={c.updateStaffRole}
      revokeStaff={c.revokeStaff}
      deleteCoachPlan={c.deleteCoachPlan}
    />
  ),
  "plan-coupons": (props, c) => <CouponsRouteSection {...c} />,
  "plan-offers": (props, c) => <OffersRouteSection {...c} />,
  "plan-referrals": (props, c) => <ReferralsRouteSection {...c} />,
  plans: (props, c) => (
    <PlansSection
      membershipPlans={c.membershipPlans}
      membershipPlansState={c.membershipPlansState}
      coachPlans={c.coachPlans}
      coachPlansState={c.coachPlansState}
      activeCouponCount={c.coupons.filter((coupon: any) => coupon.active).length}
      activeOfferCount={c.offers.filter((offer: any) => offer.active).length}
      referralCodeCount={c.referrals.length}
      planForm={c.planForm}
      setPlanForm={c.setPlanForm}
      planEditForm={c.planEditForm}
      setPlanEditForm={c.setPlanEditForm}
      editingPlanId={c.editingPlanId}
      setEditingPlanId={c.setEditingPlanId}
      formError={c.formError}
      formStatus={c.formStatus}
      formBusy={c.formBusy}
      createMembershipPlan={c.createMembershipPlan}
      startPlanEdit={c.startPlanEdit}
      updateMembershipPlan={c.updateMembershipPlan}
      deleteMembershipPlan={c.deleteMembershipPlan}
    />
  ),
  branches: (props, c) => (
    <BranchesSection
      branches={c.branches}
      branchesState={c.branchesState}
      branchForm={c.branchForm}
      setBranchForm={c.setBranchForm}
      branchEditForm={c.branchEditForm}
      setBranchEditForm={c.setBranchEditForm}
      editingBranchId={c.editingBranchId}
      setEditingBranchId={c.setEditingBranchId}
      staffAssignments={c.staffAssignments}
      staffUsersById={c.staffUsersById}
      membershipPlans={c.membershipPlans}
      formError={c.formError}
      formStatus={c.formStatus}
      formBusy={c.formBusy}
      createBranch={c.createBranch}
      saveBranchEdit={c.saveBranchEdit}
      startBranchEdit={c.startBranchEdit}
      updateBranch={c.updateBranch}
      deactivateBranch={c.deactivateBranch}
    />
  ),
  payments: (props, c) => (
    <PaymentsPanel
      orgId={props.orgId}
      summary={props.summary}
      queuedOrders={c.queuedOrders}
      membershipPlans={c.membershipPlans}
      members={c.members}
      payments={c.payments}
      paymentsState={c.paymentsState}
      shopOrders={c.shopOrders}
      shopOrdersState={c.shopOrdersState}
      permissions={props.permissions ?? []}
    />
  ),
  "payment-refunds": (props, c) => (
    <RefundsSection payments={c.payments} onRefundSubmitted={c.paymentsState.reload} />
  ),
  billing: (props) => (
    <BillingSection orgId={props.orgId} organization={props.organization} summary={props.summary} />
  ),
  settings: (props) => (
    <SettingsSection
      orgId={props.orgId}
      organization={props.organization}
      summary={props.summary}
      branchScope={props.branchScope}
      permissions={props.permissions ?? []}
    />
  ),
  reports: (props, c) => (
    <ReportsPanel
      organization={props.organization}
      summary={props.summary}
      charts={props.charts}
      selectedBranchName={c.selectedBranchName}
      selectedBranchId={c.branchScope.selectedBranch?.id ?? null}
      auditLogCount={props.auditLogCount}
    />
  ),
  audit: (props, c) => (
    <AuditPanel
      orgId={props.orgId}
      auditLogs={c.auditLogs}
      auditLogsState={c.auditLogsState}
      auditLogCount={props.auditLogCount}
      aiUsage={c.aiUsage}
      aiUsageState={c.aiUsageState}
      misconfiguredAiCount={c.misconfiguredAiCount}
    />
  ),
  ai: (props, c) => (
    <AiPanel
      orgId={props.orgId}
      summary={props.summary}
      aiUsage={c.aiUsage}
      aiUsageState={c.aiUsageState}
      coachPlans={c.coachPlans}
      misconfiguredAiCount={c.misconfiguredAiCount}
    />
  ),
};

function DashboardPanelContent(props: DashboardOperationalPanelProps) {
  const controller = useDashboardOperationalController(props);
  const renderer = REGISTRY[props.mode];
  if (renderer) {
    return renderer(props, controller);
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
  return (
    <SettingsSection
      orgId={props.orgId}
      organization={props.organization}
      summary={props.summary}
      branchScope={props.branchScope}
      permissions={props.permissions ?? []}
    />
  );
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
  return (
    <ReportsPanel
      organization={props.organization}
      summary={props.summary}
      charts={props.charts}
      selectedBranchName={
        props.branchScope.selectedBranch?.name ??
        props.branchScope.branches[0]?.name ??
        props.organization.name
      }
      selectedBranchId={props.branchScope.selectedBranch?.id ?? null}
      auditLogCount={props.auditLogCount}
    />
  );
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
  return (
    <BillingSection orgId={props.orgId} organization={props.organization} summary={props.summary} />
  );
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
