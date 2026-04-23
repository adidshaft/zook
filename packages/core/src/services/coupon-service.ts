import type { Coupon } from "../types";

export interface CouponRedemptionCount {
  total: number;
  byUser: number;
}

export function applyCoupon(
  coupon: Coupon,
  input: { amountPaise: number; planId?: string; now?: Date; redemptionCount?: CouponRedemptionCount },
): { finalAmountPaise: number; discountPaise: number } {
  const now = input.now ?? new Date();
  if (!coupon.active) {
    throw new Error("Coupon inactive");
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    throw new Error("Coupon not yet valid");
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    throw new Error("Coupon expired");
  }
  if (coupon.applicablePlanId && coupon.applicablePlanId !== input.planId) {
    throw new Error("Coupon not applicable to plan");
  }
  if (coupon.maxRedemptions && (input.redemptionCount?.total ?? 0) >= coupon.maxRedemptions) {
    throw new Error("Coupon redemption limit reached");
  }
  if (coupon.perUserLimit && (input.redemptionCount?.byUser ?? 0) >= coupon.perUserLimit) {
    throw new Error("Coupon user limit reached");
  }

  const discountPaise =
    coupon.type === "FIXED_AMOUNT"
      ? (coupon.valuePaise ?? 0)
      : Math.floor((input.amountPaise * (coupon.valuePercentBps ?? 0)) / 10_000);
  const boundedDiscount = Math.min(discountPaise, input.amountPaise);
  return { finalAmountPaise: input.amountPaise - boundedDiscount, discountPaise: boundedDiscount };
}
