"use client";

import {
  AiPanel,
  AttendancePanel,
  AuditPanel,
  NotificationsPanel,
  PaymentsPanel,
  ReportsPanel,
} from "./dashboard/read-only-panels";
import { BranchesSection } from "./dashboard/sections/branches-section";
import { ShopSection } from "./dashboard/sections/shop-section";
import { MembersSection } from "./dashboard/sections/members-section";
import { StaffSection } from "./dashboard/sections/staff-section";
import { OverviewOperationalSection } from "./dashboard/sections/overview-operational-section";
import {
  CouponsRouteSection,
  OffersRouteSection,
  ReferralsRouteSection,
} from "./dashboard/sections/plan-growth-sections";
import { PlansSection } from "./dashboard/sections/plans-section";
import { GymProfileSetupPanel } from "./gym-profile-setup-panel";
import {
  type DashboardOperationalPanelProps,
  useDashboardOperationalController,
} from "./dashboard/operational/use-dashboard-operational-controller";

export function DashboardOperationalPanel(props: DashboardOperationalPanelProps) {
  const controller = useDashboardOperationalController(props);
  const {
    orgId,
    sectionKey,
    organization,
    summary,
    branchScope,
    auditLogCount,
    initialNotifications,
    initialProducts,
    initialAiUsage,
    roles = [],
    permissions = [],
  } = props;
  const {
    mode,
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
    couponForm,
    setCouponForm,
    editingCouponId,
    setEditingCouponId,
    couponEditForm,
    setCouponEditForm,
    offerForm,
    setOfferForm,
    editingOfferId,
    setEditingOfferId,
    offerEditForm,
    setOfferEditForm,
    referralForm,
    setReferralForm,
    policyForm,
    setPolicyForm,
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
    couponsState,
    branchesState,
    referralPolicyState,
    referralsState,
    referralAnalyticsState,
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
    saveReferralPolicy,
    createCoupon,
    toggleCoupon,
    startCouponEdit,
    updateCoupon,
    createOffer,
    toggleOffer,
    startOfferEdit,
    updateOffer,
    createReferral,
    updateReferral,
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
      <MembersSection
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
        view={sectionKey === "shop/orders" ? "orders" : "products"}
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

  if (mode === "plans") {
    if (sectionKey === "plans/coupons") {
      return <CouponsRouteSection {...controller} />;
    }

    if (sectionKey === "plans/offers") {
      return <OffersRouteSection {...controller} />;
    }

    if (sectionKey === "plans/referrals") {
      return <ReferralsRouteSection {...controller} />;
    }

    return (
      <PlansSection
        membershipPlans={membershipPlans}
        membershipPlansState={membershipPlansState}
        coachPlans={coachPlans}
        coachPlansState={coachPlansState}
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
    <OverviewOperationalSection
      orgId={orgId}
      organization={organization}
      summary={summary}
      auditLogCount={auditLogCount}
      initialNotifications={initialNotifications}
      initialProducts={initialProducts}
      initialAiUsage={initialAiUsage}
      overviewWorkflowCards={overviewWorkflowCards}
      branches={branches}
      branchesState={branchesState}
      branchForm={branchForm}
      setBranchForm={setBranchForm}
      editingBranchId={editingBranchId}
      setEditingBranchId={setEditingBranchId}
      branchEditForm={branchEditForm}
      setBranchEditForm={setBranchEditForm}
      staffAssignments={staffAssignments}
      staffUsersById={staffUsersById}
      formBusy={formBusy}
      formError={formError}
      formStatus={formStatus}
      createBranch={createBranch}
      saveBranchEdit={saveBranchEdit}
      startBranchEdit={startBranchEdit}
      updateBranch={updateBranch}
      deactivateBranch={deactivateBranch}
      referralPolicy={referralPolicy}
      referralPolicyState={referralPolicyState}
      referralAnalytics={referralAnalytics}
      referralAnalyticsState={referralAnalyticsState}
      referralsState={referralsState}
      couponsState={couponsState}
      coupons={coupons}
      offers={offers}
      referrals={referrals}
      referralUsersById={referralUsersById}
      membershipPlans={membershipPlans}
      couponForm={couponForm}
      setCouponForm={setCouponForm}
      editingCouponId={editingCouponId}
      setEditingCouponId={setEditingCouponId}
      couponEditForm={couponEditForm}
      setCouponEditForm={setCouponEditForm}
      offerForm={offerForm}
      setOfferForm={setOfferForm}
      editingOfferId={editingOfferId}
      setEditingOfferId={setEditingOfferId}
      offerEditForm={offerEditForm}
      setOfferEditForm={setOfferEditForm}
      referralForm={referralForm}
      setReferralForm={setReferralForm}
      policyForm={policyForm}
      setPolicyForm={setPolicyForm}
      createCoupon={createCoupon}
      updateCoupon={updateCoupon}
      toggleCoupon={toggleCoupon}
      startCouponEdit={startCouponEdit}
      createOffer={createOffer}
      updateOffer={updateOffer}
      toggleOffer={toggleOffer}
      startOfferEdit={startOfferEdit}
      createReferral={createReferral}
      updateReferral={updateReferral}
      saveReferralPolicy={saveReferralPolicy}
    />
  );
}
