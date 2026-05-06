"use client";

import { useState } from "react";
import {
  type CouponKind,
  type DiscountType,
  type MembershipPlanType,
  type OrganizationSnapshot,
  type ProductCategory,
  type RewardType,
  type StaffRole,
} from "../../dashboard-operational-model";
import { defaultBranchHoursText } from "../sections/branch-hours-editor";
import type { BranchFormState } from "../sections/branches-section";

export function createEmptyPlanForm() {
  return {
    name: "",
    type: "HYBRID" as MembershipPlanType,
    priceRupees: "",
    durationDays: "",
    visitLimit: "",
    description: "",
    publicVisible: true,
    active: true,
  };
}

export type PlanForm = ReturnType<typeof createEmptyPlanForm>;

export function createEmptyProductForm() {
  return {
    name: "",
    category: "OTHER" as ProductCategory,
    priceRupees: "",
    stock: "",
    lowStockThreshold: "5",
    description: "",
    active: true,
  };
}

export type ProductForm = ReturnType<typeof createEmptyProductForm>;

export function createEmptyCouponForm() {
  return {
    code: "",
    type: "PERCENTAGE" as CouponKind,
    value: "1000",
    maxRedemptions: "",
    perUserLimit: "1",
    applicablePlanId: "",
  };
}

export type CouponForm = ReturnType<typeof createEmptyCouponForm>;

export function createEmptyOfferForm() {
  return {
    name: "",
    discountType: "PERCENTAGE" as CouponKind,
    discountValue: "1500",
    applicablePlanId: "",
    endsInDays: "30",
    stackable: true,
  };
}

export type OfferForm = ReturnType<typeof createEmptyOfferForm>;

export function createEmptyReferralForm() {
  return {
    code: "",
    couponId: "",
    maxUses: "20",
    createdByRole: "MEMBER" as "OWNER" | "ADMIN" | "RECEPTIONIST" | "TRAINER" | "MEMBER",
  };
}

export function createDefaultPolicyForm() {
  return {
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
  };
}

export function createEmptyStaffInvite() {
  return {
    email: "",
    role: "TRAINER" as StaffRole,
  };
}

export function createEmptyBranchForm(organization: OrganizationSnapshot): BranchFormState {
  return {
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
    hoursText: defaultBranchHoursText,
    commerceSetup: undefined,
    isDefault: false,
  };
}

export function useDashboardOperationalState(organization: OrganizationSnapshot) {
  const emptyPlanForm = createEmptyPlanForm();
  const emptyProductForm = createEmptyProductForm();
  const emptyCouponForm = createEmptyCouponForm();
  const emptyOfferForm = createEmptyOfferForm();
  const emptyBranchForm = createEmptyBranchForm(organization);

  const [queueBusyId, setQueueBusyId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState("");
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [planEditForm, setPlanEditForm] = useState(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productEditForm, setProductEditForm] = useState(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    productId: "",
    delta: "",
    reason: "",
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffRoleDraft, setStaffRoleDraft] = useState<StaffRole>("TRAINER");
  const [staffBranchDraft, setStaffBranchDraft] = useState("");
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [couponEditForm, setCouponEditForm] = useState(emptyCouponForm);
  const [offerForm, setOfferForm] = useState(emptyOfferForm);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditForm, setOfferEditForm] = useState(emptyOfferForm);
  const [referralForm, setReferralForm] = useState(createEmptyReferralForm());
  const [policyForm, setPolicyForm] = useState(createDefaultPolicyForm());
  const [staffInvite, setStaffInvite] = useState(createEmptyStaffInvite());
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchEditForm, setBranchEditForm] = useState<BranchFormState>(emptyBranchForm);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [formBusy, setFormBusy] = useState<string | null>(null);

  return {
    emptyPlanForm,
    emptyProductForm,
    emptyCouponForm,
    emptyOfferForm,
    emptyBranchForm,
    queueBusyId,
    setQueueBusyId,
    queueError,
    setQueueError,
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
    setFormStatus,
    formError,
    setFormError,
    formBusy,
    setFormBusy,
  };
}

export type DashboardOperationalState = ReturnType<typeof useDashboardOperationalState>;
