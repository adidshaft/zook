import { webApiFetch } from "@/lib/api-client";
import {
  type CouponRow,
  type OfferRow,
  type ReferralCodeRow,
} from "@/components/dashboard/types";
import {
  createEmptyCouponForm,
  createEmptyOfferForm,
  createEmptyReferralForm,
  type CouponForm,
  type DashboardOperationalState,
} from "../controller-state";
import { type DashboardOperationalResources } from "../controller-resources";

function percentInputToBps(value: string) {
  return Math.round(Number(value || 0) * 100);
}

function bpsToPercentInput(value: number | null | undefined) {
  const percent = (value ?? 0) / 100;
  return Number.isInteger(percent) ? percent.toString() : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function payloadForCouponForm(form: CouponForm) {
  return {
    code: form.code,
    type: form.type,
    ...(form.type === "PERCENTAGE"
      ? { valuePercentBps: percentInputToBps(form.value) }
      : { valuePaise: Math.round(Number(form.value || 0) * 100) }),
    ...(form.maxRedemptions ? { maxRedemptions: Number(form.maxRedemptions) } : {}),
    ...(form.perUserLimit ? { perUserLimit: Number(form.perUserLimit) } : {}),
    ...(form.applicablePlanId ? { applicablePlanId: form.applicablePlanId } : {}),
  };
}

export function createReferralActions({
  orgId,
  state,
  resources,
}: {
  orgId: string;
  state: DashboardOperationalState;
  resources: DashboardOperationalResources;
}) {
  async function updateJoinRequest(requestId: string, action: "approve" | "reject") {
    try {
      state.setQueueError("");
      state.setQueueBusyId(requestId);
      await webApiFetch(`/api/orgs/${orgId}/join-requests/${requestId}/${action}`, {
        method: "POST",
        feedback: {
          success: action === "approve" ? "Join request approved." : "Join request rejected.",
          error: action === "approve" ? "Unable to approve the join request." : "Unable to reject the join request.",
        },
      });
      resources.joinRequestsState.reload();
      resources.membersState.reload();
    } catch (cause) {
      state.setQueueError(
        cause instanceof Error ? cause.message : "Unable to update the join request.",
      );
    } finally {
      state.setQueueBusyId(null);
    }
  }

  async function saveReferralPolicy() {
    try {
      state.setFormBusy("referral-policy");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referral-policy`, {
        method: "PATCH",
        body: {
          enabled: state.policyForm.enabled,
          referrerRewardType: state.policyForm.referrerRewardType,
          referrerRewardValue: Number(state.policyForm.referrerRewardValue || 0),
          referredDiscountType: state.policyForm.referredDiscountType,
          referredDiscountValue: Number(state.policyForm.referredDiscountValue || 0),
          maxDiscountCapBps: Number(state.policyForm.maxDiscountCapBps || 0),
          maxReferralsPerMonth: Number(state.policyForm.maxReferralsPerMonth || 1),
          referralCodeExpiryDays: Number(state.policyForm.referralCodeExpiryDays || 0),
          trainerReferralEnabled: state.policyForm.trainerReferralEnabled,
          staffReferralEnabled: state.policyForm.staffReferralEnabled,
        },
      });
      resources.referralPolicyState.reload();
      state.setFormStatus("Referral policy saved.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to save referral policy.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  async function createCoupon() {
    try {
      state.setFormBusy("coupon");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons`, {
        method: "POST",
        body: {
          code: state.couponForm.code,
          type: state.couponForm.type,
          ...(state.couponForm.type === "PERCENTAGE"
            ? { valuePercentBps: percentInputToBps(state.couponForm.value) }
            : { valuePaise: Math.round(Number(state.couponForm.value || 0) * 100) }),
          maxRedemptions: state.couponForm.maxRedemptions
            ? Number(state.couponForm.maxRedemptions)
            : undefined,
          perUserLimit: state.couponForm.perUserLimit
            ? Number(state.couponForm.perUserLimit)
            : undefined,
          applicablePlanId: state.couponForm.applicablePlanId || undefined,
        },
      });
      state.setCouponForm(createEmptyCouponForm());
      resources.couponsState.reload();
      state.setFormStatus("Coupon created.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to create coupon.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function toggleCoupon(coupon: CouponRow) {
    try {
      state.setFormBusy(`coupon:${coupon.id}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons/${coupon.id}`, {
        method: "PATCH",
        body: { active: !coupon.active },
      });
      resources.couponsState.reload();
      state.setFormStatus(coupon.active ? "Coupon deactivated." : "Coupon restored.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update coupon.");
    } finally {
      state.setFormBusy(null);
    }
  }

  function startCouponEdit(coupon: CouponRow) {
    state.setEditingCouponId(coupon.id);
    state.setCouponEditForm({
      code: coupon.code,
      type: coupon.type,
      value:
        coupon.type === "PERCENTAGE"
          ? bpsToPercentInput(coupon.valuePercentBps)
          : ((coupon.valuePaise ?? 0) / 100).toString(),
      maxRedemptions: coupon.maxRedemptions?.toString() ?? "",
      perUserLimit: coupon.perUserLimit?.toString() ?? "1",
      applicablePlanId: coupon.applicablePlanId ?? "",
    });
  }

  async function updateCoupon(couponId: string) {
    try {
      state.setFormBusy(`coupon:${couponId}:edit`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/coupons/${couponId}`, {
        method: "PATCH",
        body: payloadForCouponForm(state.couponEditForm),
      });
      state.setEditingCouponId(null);
      resources.couponsState.reload();
      state.setFormStatus("Coupon updated.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update coupon.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function createOffer() {
    try {
      state.setFormBusy("offer");
      state.setFormError("");
      state.setFormStatus("");
      const now = new Date();
      const endsAt = new Date(
        now.getTime() + Number(state.offerForm.endsInDays || 30) * 24 * 60 * 60 * 1000,
      );
      await webApiFetch(`/api/orgs/${orgId}/offers`, {
        method: "POST",
        body: {
          name: state.offerForm.name,
          discountType: state.offerForm.discountType,
          discountValue:
            state.offerForm.discountType === "PERCENTAGE"
              ? percentInputToBps(state.offerForm.discountValue)
              : Math.round(Number(state.offerForm.discountValue || 0) * 100),
          applicablePlanIds: state.offerForm.applicablePlanId
            ? [state.offerForm.applicablePlanId]
            : undefined,
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          active: true,
          stackable: state.offerForm.stackable,
        },
      });
      state.setOfferForm(createEmptyOfferForm());
      resources.offersState.reload();
      state.setFormStatus("Offer created.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to create offer.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function toggleOffer(offer: OfferRow) {
    try {
      state.setFormBusy(`offer:${offer.id}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/offers/${offer.id}`, {
        method: "PATCH",
        body: { active: !offer.active },
      });
      resources.offersState.reload();
      state.setFormStatus(offer.active ? "Offer deactivated." : "Offer restored.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update offer.");
    } finally {
      state.setFormBusy(null);
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
    state.setEditingOfferId(offer.id);
    state.setOfferEditForm({
      name: offer.name,
      discountType: offer.discountType,
      discountValue:
        offer.discountType === "PERCENTAGE"
          ? bpsToPercentInput(offer.discountValue)
          : (offer.discountValue / 100).toString(),
      applicablePlanId: firstPlanId,
      endsInDays: daysLeft.toString(),
      stackable: offer.stackable,
    });
  }

  async function updateOffer(offerId: string) {
    try {
      state.setFormBusy(`offer:${offerId}:edit`);
      state.setFormError("");
      state.setFormStatus("");
      const now = new Date();
      const endsAt = new Date(
        now.getTime() + Number(state.offerEditForm.endsInDays || 30) * 24 * 60 * 60 * 1000,
      );
      await webApiFetch(`/api/orgs/${orgId}/offers/${offerId}`, {
        method: "PATCH",
        body: {
          name: state.offerEditForm.name,
          discountType: state.offerEditForm.discountType,
          discountValue:
            state.offerEditForm.discountType === "PERCENTAGE"
              ? percentInputToBps(state.offerEditForm.discountValue)
              : Math.round(Number(state.offerEditForm.discountValue || 0) * 100),
          applicablePlanIds: state.offerEditForm.applicablePlanId
            ? [state.offerEditForm.applicablePlanId]
            : [],
          startsAt: now.toISOString(),
          endsAt: endsAt.toISOString(),
          stackable: state.offerEditForm.stackable,
        },
      });
      state.setEditingOfferId(null);
      resources.offersState.reload();
      state.setFormStatus("Offer updated.");
    } catch (cause) {
      state.setFormError(cause instanceof Error ? cause.message : "Unable to update offer.");
    } finally {
      state.setFormBusy(null);
    }
  }

  async function createReferral() {
    try {
      state.setFormBusy("referral");
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referrals`, {
        method: "POST",
        body: {
          code: state.referralForm.code || undefined,
          couponId: state.referralForm.couponId || undefined,
          maxUses: state.referralForm.maxUses ? Number(state.referralForm.maxUses) : undefined,
          createdByRole: state.referralForm.createdByRole,
        },
      });
      state.setReferralForm(createEmptyReferralForm());
      resources.referralsState.reload();
      state.setFormStatus("Referral code created.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to create referral code.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  async function updateReferral(
    referral: ReferralCodeRow,
    status: "active" | "paused" | "expired",
  ) {
    try {
      state.setFormBusy(`referral:${referral.id}`);
      state.setFormError("");
      state.setFormStatus("");
      await webApiFetch(`/api/orgs/${orgId}/referrals/${referral.id}`, {
        method: "PATCH",
        body: { status },
      });
      resources.referralsState.reload();
      state.setFormStatus("Referral code updated.");
    } catch (cause) {
      state.setFormError(
        cause instanceof Error ? cause.message : "Unable to update referral code.",
      );
    } finally {
      state.setFormBusy(null);
    }
  }

  return {
    updateJoinRequest,
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
  };
}
