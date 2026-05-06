import type { Dispatch, SetStateAction } from "react";
import type { PillTone } from "../../../glass-card";
import type { BranchFormState } from "../branches-section";
import type {
  AIUsageRow,
  BranchRow,
  CouponKind,
  CouponRow,
  DiscountType,
  MembershipPlanRow,
  NotificationSnapshot,
  OfferRow,
  OrganizationSnapshot,
  OrganizationSummary,
  ProductSnapshot,
  ReferralAnalyticsPayload,
  ReferralCodeRow,
  ReferralPolicyRow,
  RewardType,
  StaffAssignmentRow,
  StaffUserRow,
} from "../../../dashboard-operational-model";

export type ResourceState<T> = {
  data: T | undefined;
  error: string;
  loading: boolean;
};

export type CouponFormState = {
  code: string;
  type: CouponKind;
  value: string;
  maxRedemptions: string;
  perUserLimit: string;
  applicablePlanId: string;
};

export type OfferFormState = {
  name: string;
  discountType: CouponKind;
  discountValue: string;
  applicablePlanId: string;
  endsInDays: string;
  stackable: boolean;
};

export type ReferralFormState = {
  code: string;
  couponId: string;
  maxUses: string;
  createdByRole: "OWNER" | "ADMIN" | "RECEPTIONIST" | "TRAINER" | "MEMBER";
};

export type PolicyFormState = {
  enabled: boolean;
  referrerRewardType: RewardType;
  referrerRewardValue: string;
  referredDiscountType: DiscountType;
  referredDiscountValue: string;
  maxDiscountCapBps: string;
  maxReferralsPerMonth: string;
  referralCodeExpiryDays: string;
  trainerReferralEnabled: boolean;
  staffReferralEnabled: boolean;
};

export type OverviewWorkflowCard = {
  label: string;
  href: string;
  detail: string;
  tone: PillTone;
};

export type OverviewOperationalSectionProps = {
  orgId: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  auditLogCount: number;
  initialNotifications: NotificationSnapshot[];
  initialProducts: ProductSnapshot[];
  initialAiUsage: AIUsageRow[];
  overviewWorkflowCards: OverviewWorkflowCard[];
  branches: BranchRow[];
  branchesState: ResourceState<{ branches: BranchRow[] }>;
  branchForm: BranchFormState;
  setBranchForm: Dispatch<SetStateAction<BranchFormState>>;
  editingBranchId: string | null;
  setEditingBranchId: Dispatch<SetStateAction<string | null>>;
  branchEditForm: BranchFormState;
  setBranchEditForm: Dispatch<SetStateAction<BranchFormState>>;
  staffAssignments: StaffAssignmentRow[];
  staffUsersById: Map<string, StaffUserRow>;
  formBusy: string | null;
  formError: string;
  formStatus: string;
  createBranch: () => Promise<void>;
  saveBranchEdit: (branch: BranchRow) => Promise<void>;
  startBranchEdit: (branch: BranchRow) => void;
  updateBranch: (branch: BranchRow, patch: Partial<BranchRow>) => Promise<void>;
  deactivateBranch: (branch: BranchRow) => Promise<void>;
  referralPolicy: ReferralPolicyRow | null;
  referralPolicyState: ResourceState<{ policy: ReferralPolicyRow }>;
  referralAnalytics: ReferralAnalyticsPayload | undefined;
  referralAnalyticsState: ResourceState<ReferralAnalyticsPayload>;
  referralsState: ResourceState<{ referrals: ReferralCodeRow[]; users: StaffUserRow[]; coupons: CouponRow[] }>;
  couponsState: ResourceState<{ coupons: CouponRow[] }>;
  coupons: CouponRow[];
  offers: OfferRow[];
  referrals: ReferralCodeRow[];
  referralUsersById: Map<string, StaffUserRow>;
  membershipPlans: MembershipPlanRow[];
  couponForm: CouponFormState;
  setCouponForm: Dispatch<SetStateAction<CouponFormState>>;
  editingCouponId: string | null;
  setEditingCouponId: Dispatch<SetStateAction<string | null>>;
  couponEditForm: CouponFormState;
  setCouponEditForm: Dispatch<SetStateAction<CouponFormState>>;
  offerForm: OfferFormState;
  setOfferForm: Dispatch<SetStateAction<OfferFormState>>;
  editingOfferId: string | null;
  setEditingOfferId: Dispatch<SetStateAction<string | null>>;
  offerEditForm: OfferFormState;
  setOfferEditForm: Dispatch<SetStateAction<OfferFormState>>;
  referralForm: ReferralFormState;
  setReferralForm: Dispatch<SetStateAction<ReferralFormState>>;
  policyForm: PolicyFormState;
  setPolicyForm: Dispatch<SetStateAction<PolicyFormState>>;
  createCoupon: () => Promise<void>;
  updateCoupon: (couponId: string) => Promise<void>;
  toggleCoupon: (coupon: CouponRow) => Promise<void>;
  startCouponEdit: (coupon: CouponRow) => void;
  createOffer: () => Promise<void>;
  updateOffer: (offerId: string) => Promise<void>;
  toggleOffer: (offer: OfferRow) => Promise<void>;
  startOfferEdit: (offer: OfferRow) => void;
  createReferral: () => Promise<void>;
  updateReferral: (referral: ReferralCodeRow, status: "active" | "paused") => Promise<void>;
  saveReferralPolicy: () => Promise<void>;
};
