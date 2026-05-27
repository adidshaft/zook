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
} from "@/components/dashboard/types";

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

export type SharedOperationalProps = {
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  auditLogCount: number;
  formBusy: string | null;
  formError: string;
  formStatus: string;
};

export type BranchOperationalProps = {
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
  createBranch: () => Promise<void>;
  saveBranchEdit: (branch: BranchRow) => Promise<void>;
  startBranchEdit: (branch: BranchRow) => void;
  updateBranch: (branch: BranchRow, patch: Partial<BranchRow>) => Promise<void>;
  deactivateBranch: (branch: BranchRow) => Promise<void>;
};

export type CouponOfferProps = {
  coupons: CouponRow[];
  couponsState: ResourceState<{ coupons: CouponRow[] }>;
  couponForm: CouponFormState;
  setCouponForm: Dispatch<SetStateAction<CouponFormState>>;
  editingCouponId: string | null;
  setEditingCouponId: Dispatch<SetStateAction<string | null>>;
  couponEditForm: CouponFormState;
  setCouponEditForm: Dispatch<SetStateAction<CouponFormState>>;
  createCoupon: () => Promise<void>;
  updateCoupon: (couponId: string) => Promise<void>;
  toggleCoupon: (coupon: CouponRow) => Promise<void>;
  startCouponEdit: (coupon: CouponRow) => void;

  offers: OfferRow[];
  offerForm: OfferFormState;
  setOfferForm: Dispatch<SetStateAction<OfferFormState>>;
  editingOfferId: string | null;
  setEditingOfferId: Dispatch<SetStateAction<string | null>>;
  offerEditForm: OfferFormState;
  setOfferEditForm: Dispatch<SetStateAction<OfferFormState>>;
  createOffer: () => Promise<void>;
  updateOffer: (offerId: string) => Promise<void>;
  toggleOffer: (offer: OfferRow) => Promise<void>;
  startOfferEdit: (offer: OfferRow) => void;

  membershipPlans: MembershipPlanRow[];
};

export type ReferralOperationalProps = {
  referralPolicy: ReferralPolicyRow | null;
  referralPolicyState: ResourceState<{ policy: ReferralPolicyRow }>;
  referralAnalytics: ReferralAnalyticsPayload | undefined;
  referralAnalyticsState: ResourceState<ReferralAnalyticsPayload>;
  referralsState: ResourceState<{ referrals: ReferralCodeRow[]; users: StaffUserRow[]; coupons: CouponRow[] }>;
  referrals: ReferralCodeRow[];
  referralUsersById: Map<string, StaffUserRow>;
  referralForm: ReferralFormState;
  setReferralForm: Dispatch<SetStateAction<ReferralFormState>>;
  policyForm: PolicyFormState;
  setPolicyForm: Dispatch<SetStateAction<PolicyFormState>>;
  createReferral: () => Promise<void>;
  updateReferral: (referral: ReferralCodeRow, status: "active" | "paused") => Promise<void>;
  saveReferralPolicy: () => Promise<void>;
};

export type OverviewOperationalSectionProps = SharedOperationalProps &
  BranchOperationalProps &
  CouponOfferProps &
  ReferralOperationalProps & {
    initialNotifications: NotificationSnapshot[];
    initialProducts: ProductSnapshot[];
    initialAiUsage: AIUsageRow[];
    overviewWorkflowCards: OverviewWorkflowCard[];
  };
