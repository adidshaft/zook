"use client";

import { useEffect } from "react";
import { createPlansProductsActions } from "./actions/plans-products";
import { createReferralActions } from "./actions/referrals";
import { createStaffBranchesActions } from "./actions/staff-branches";
import { useDashboardOperationalResources } from "./controller-resources";
import { useDashboardOperationalState } from "./controller-state";
import { type DashboardOperationalPanelProps } from "./controller-types";

export type { DashboardOperationalPanelProps } from "./controller-types";

function operationalModeForSection(sectionKey: string) {
  if (sectionKey.includes("public-profile") || sectionKey === "org") {
    return "public-profile";
  }
  if (sectionKey === "settings") {
    return "settings";
  }
  if (sectionKey.includes("join-requests")) {
    return "join-requests";
  }
  if (sectionKey.includes("attendance")) {
    return "attendance";
  }
  if (sectionKey.includes("notifications/templates")) {
    return "notification-templates";
  }
  if (sectionKey.includes("notifications/history")) {
    return "notification-history";
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
  if (sectionKey === "plans/coupons" || sectionKey.startsWith("plans/coupons/")) {
    return "plan-coupons";
  }
  if (sectionKey === "plans/offers" || sectionKey.startsWith("plans/offers/")) {
    return "plan-offers";
  }
  if (sectionKey === "plans/referrals" || sectionKey.startsWith("plans/referrals/")) {
    return "plan-referrals";
  }
  if (sectionKey.includes("membership-plans") || sectionKey === "plans") {
    return "plans";
  }
  if (sectionKey.includes("billing")) {
    return "billing";
  }
  if (sectionKey.includes("payments/refunds")) {
    return "payment-refunds";
  }
  if (sectionKey.includes("payments") || sectionKey.includes("checkout")) {
    return "payments";
  }
  if (sectionKey.includes("branches")) {
    return "branches";
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

export function useDashboardOperationalController({
  orgId,
  sectionKey,
  organization,
  summary,
  branchScope,
  initialJoinRequests,
  initialAiUsage,
}: DashboardOperationalPanelProps) {
  const mode = operationalModeForSection(sectionKey);
  const state = useDashboardOperationalState(organization);
  const resources = useDashboardOperationalResources({
    orgId,
    mode,
    selectedMemberId: state.selectedMemberId,
    initialJoinRequests,
    initialAiUsage,
    summary,
    branchScope,
  });

  useEffect(() => {
    if (!resources.referralPolicy) return;
    state.setPolicyForm({
      enabled: resources.referralPolicy.enabled,
      referrerRewardType: resources.referralPolicy.referrerRewardType,
      referrerRewardValue: resources.referralPolicy.referrerRewardValue.toString(),
      referredDiscountType: resources.referralPolicy.referredDiscountType,
      referredDiscountValue: resources.referralPolicy.referredDiscountValue.toString(),
      maxDiscountCapBps: resources.referralPolicy.maxDiscountCapBps.toString(),
      maxReferralsPerMonth: resources.referralPolicy.maxReferralsPerMonth.toString(),
      referralCodeExpiryDays: resources.referralPolicy.referralCodeExpiryDays.toString(),
      trainerReferralEnabled: resources.referralPolicy.trainerReferralEnabled,
      staffReferralEnabled: resources.referralPolicy.staffReferralEnabled,
    });
  }, [resources.referralPolicy, state.setPolicyForm]);

  const plansProductsActions = createPlansProductsActions({
    orgId,
    state,
    resources,
  });
  const staffBranchesActions = createStaffBranchesActions({
    orgId,
    state,
    resources,
  });
  const referralActions = createReferralActions({
    orgId,
    state,
    resources,
  });

  return {
    mode,
    queueBusyId: state.queueBusyId,
    queueError: state.queueError,
    planForm: state.planForm,
    setPlanForm: state.setPlanForm,
    planEditForm: state.planEditForm,
    setPlanEditForm: state.setPlanEditForm,
    editingPlanId: state.editingPlanId,
    setEditingPlanId: state.setEditingPlanId,
    productForm: state.productForm,
    setProductForm: state.setProductForm,
    productEditForm: state.productEditForm,
    setProductEditForm: state.setProductEditForm,
    editingProductId: state.editingProductId,
    setEditingProductId: state.setEditingProductId,
    stockAdjustment: state.stockAdjustment,
    setStockAdjustment: state.setStockAdjustment,
    editingStaffId: state.editingStaffId,
    setEditingStaffId: state.setEditingStaffId,
    staffRoleDraft: state.staffRoleDraft,
    setStaffRoleDraft: state.setStaffRoleDraft,
    staffBranchDraft: state.staffBranchDraft,
    setStaffBranchDraft: state.setStaffBranchDraft,
    couponForm: state.couponForm,
    setCouponForm: state.setCouponForm,
    editingCouponId: state.editingCouponId,
    setEditingCouponId: state.setEditingCouponId,
    couponEditForm: state.couponEditForm,
    setCouponEditForm: state.setCouponEditForm,
    offerForm: state.offerForm,
    setOfferForm: state.setOfferForm,
    editingOfferId: state.editingOfferId,
    setEditingOfferId: state.setEditingOfferId,
    offerEditForm: state.offerEditForm,
    setOfferEditForm: state.setOfferEditForm,
    referralForm: state.referralForm,
    setReferralForm: state.setReferralForm,
    policyForm: state.policyForm,
    setPolicyForm: state.setPolicyForm,
    staffInvite: state.staffInvite,
    setStaffInvite: state.setStaffInvite,
    branchForm: state.branchForm,
    setBranchForm: state.setBranchForm,
    editingBranchId: state.editingBranchId,
    setEditingBranchId: state.setEditingBranchId,
    branchEditForm: state.branchEditForm,
    setBranchEditForm: state.setBranchEditForm,
    selectedMemberId: state.selectedMemberId,
    setSelectedMemberId: state.setSelectedMemberId,
    formStatus: state.formStatus,
    formError: state.formError,
    formBusy: state.formBusy,
    membersState: resources.membersState,
    joinRequestsState: resources.joinRequestsState,
    membershipPlansState: resources.membershipPlansState,
    staffState: resources.staffState,
    coachPlansState: resources.coachPlansState,
    productsState: resources.productsState,
    shopOrdersState: resources.shopOrdersState,
    paymentsState: resources.paymentsState,
    attendanceState: resources.attendanceState,
    auditLogsState: resources.auditLogsState,
    aiUsageState: resources.aiUsageState,
    couponsState: resources.couponsState,
    branchesState: resources.branchesState,
    referralPolicyState: resources.referralPolicyState,
    referralsState: resources.referralsState,
    referralAnalyticsState: resources.referralAnalyticsState,
    memberDetailState: resources.memberDetailState,
    membershipPlans: resources.membershipPlans,
    members: resources.members,
    joinRequests: resources.joinRequests,
    staffAssignments: resources.staffAssignments,
    coachPlans: resources.coachPlans,
    inventory: resources.inventory,
    shopOrders: resources.shopOrders,
    payments: resources.payments,
    attendanceRecords: resources.attendanceRecords,
    auditLogs: resources.auditLogs,
    aiUsage: resources.aiUsage,
    coupons: resources.coupons,
    offers: resources.offers,
    branches: resources.branches,
    referralPolicy: resources.referralPolicy,
    referrals: resources.referrals,
    referralAnalytics: resources.referralAnalytics,
    referralUsersById: resources.referralUsersById,
    selectedBranchName: resources.selectedBranchName,
    planNamesById: resources.planNamesById,
    staffUsersById: resources.staffUsersById,
    queuedOrders: resources.queuedOrders,
    readyOrders: resources.readyOrders,
    misconfiguredAiCount: resources.misconfiguredAiCount,
    overviewWorkflowCards: resources.overviewWorkflowCards,
    ...plansProductsActions,
    ...staffBranchesActions,
    ...referralActions,
  };
}
