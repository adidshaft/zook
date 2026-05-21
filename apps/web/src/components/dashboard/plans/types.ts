import type { Dispatch, SetStateAction } from "react";
import type {
  CoachPlanRow,
  MembershipPlanRow,
  MembershipPlanType,
} from "../../dashboard-operational-model";
import type { OverviewOperationalSectionProps } from "../sections/overview/types";

export type PlanFormState = {
  name: string;
  type: MembershipPlanType;
  priceRupees: string;
  durationDays: string;
  visitLimit: string;
  description: string;
  publicVisible: boolean;
  active: boolean;
};

export type ResourceState = {
  error: string;
  loading: boolean;
};

export type PlanPatch = Partial<{
  name: string;
  description?: string;
  type: MembershipPlanType;
  pricePaise: number;
  durationDays?: number;
  visitLimit?: number;
  validityDays?: number;
  publicVisible: boolean;
  active: boolean;
}>;

export type PlansSectionProps = {
  membershipPlans: MembershipPlanRow[];
  membershipPlansState: ResourceState;
  coachPlans: CoachPlanRow[];
  coachPlansState: ResourceState;
  activeCouponCount: number;
  activeOfferCount: number;
  referralCodeCount: number;
  planForm: PlanFormState;
  setPlanForm: Dispatch<SetStateAction<PlanFormState>>;
  planEditForm: PlanFormState;
  setPlanEditForm: Dispatch<SetStateAction<PlanFormState>>;
  editingPlanId: string | null;
  setEditingPlanId: Dispatch<SetStateAction<string | null>>;
  formError: string;
  formStatus: string;
  formBusy: string | null;
  createMembershipPlan: () => Promise<void>;
  startPlanEdit: (plan: MembershipPlanRow) => void;
  updateMembershipPlan: (planId: string, patch?: PlanPatch) => Promise<void>;
  deleteMembershipPlan: (planId: string) => Promise<void>;
};

export type GrowthRouteProps = Pick<
  OverviewOperationalSectionProps,
  | "referralPolicy"
  | "referralPolicyState"
  | "referralAnalytics"
  | "referralAnalyticsState"
  | "referralsState"
  | "couponsState"
  | "coupons"
  | "offers"
  | "referrals"
  | "referralUsersById"
  | "membershipPlans"
  | "couponForm"
  | "setCouponForm"
  | "editingCouponId"
  | "setEditingCouponId"
  | "couponEditForm"
  | "setCouponEditForm"
  | "offerForm"
  | "setOfferForm"
  | "editingOfferId"
  | "setEditingOfferId"
  | "offerEditForm"
  | "setOfferEditForm"
  | "referralForm"
  | "setReferralForm"
  | "policyForm"
  | "setPolicyForm"
  | "formBusy"
  | "formError"
  | "formStatus"
  | "createCoupon"
  | "updateCoupon"
  | "toggleCoupon"
  | "startCouponEdit"
  | "createOffer"
  | "updateOffer"
  | "toggleOffer"
  | "startOfferEdit"
  | "createReferral"
  | "updateReferral"
  | "saveReferralPolicy"
>;
