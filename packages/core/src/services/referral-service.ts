import type { ReferralCode, RequestContext } from "../types";
import { assertAuthenticatedContext, ServiceAuthorizationError } from "./rbac-service";

export function validateReferralRedemption(
  referral: ReferralCode,
  input: {
    referredUserId: string;
    referredEmail?: string;
    referrerEmail?: string;
    existingRedemption?: boolean;
    now?: Date;
    ctx?: RequestContext;
  },
): void {
  if (input.ctx) {
    assertReferralRedeemContext(input.ctx, {
      orgId: referral.orgId,
      referredUserId: input.referredUserId,
    });
  }
  const now = input.now ?? new Date();
  if (referral.status !== "active") {
    throw new Error("Referral inactive");
  }
  if (referral.expiresAt && referral.expiresAt < now) {
    throw new Error("Referral expired");
  }
  if (referral.maxUses && referral.redemptionCount >= referral.maxUses) {
    throw new Error("Referral max uses reached");
  }
  if (referral.referrerUserId === input.referredUserId) {
    throw new Error("Self-referral is not allowed");
  }
  if (input.referredEmail && input.referrerEmail && input.referredEmail.toLowerCase() === input.referrerEmail.toLowerCase()) {
    throw new Error("Same email referral is not allowed");
  }
  if (input.existingRedemption) {
    throw new Error("Referral already redeemed for this organization");
  }
}

export function assertReferralRedeemContext(
  ctx: RequestContext,
  input: { orgId: string; referredUserId: string },
) {
  const actorUserId = assertAuthenticatedContext(ctx);
  if (actorUserId !== input.referredUserId) {
    throw new ServiceAuthorizationError(
      "forbidden",
      "Referral can only be redeemed by the referred member",
    );
  }
  return actorUserId;
}
