import type { MemberSubscription, MembershipPlan, OrganizationStatus } from "../types";

export interface MembershipEvaluation {
  valid: boolean;
  reason?: string;
  consumesVisit: boolean;
  remainingVisits?: number;
  warnings?: string[];
}

export function computeSubscriptionWindow(plan: MembershipPlan, now = new Date()): { startsAt: Date; endsAt?: Date; remainingVisits?: number } {
  const startsAt = plan.startDate ?? now;
  const days =
    plan.type === "DATE_RANGE"
      ? undefined
      : plan.durationDays ?? plan.validityDays ?? (plan.type === "TRIAL" ? 7 : undefined);
  const endsAt = plan.endDate ?? (days ? new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000) : undefined);
  return {
    startsAt,
    ...(endsAt ? { endsAt } : {}),
    ...(plan.visitLimit !== undefined ? { remainingVisits: plan.visitLimit } : {})
  };
}

export function evaluateSubscription(
  subscription: MemberSubscription,
  plan: MembershipPlan,
  input: { now?: Date; orgStatus?: OrganizationStatus; hasProfilePhoto?: boolean } = {},
): MembershipEvaluation {
  const now = input.now ?? new Date();
  if (input.orgStatus === "SUSPENDED" || input.orgStatus === "CANCELLED" || input.orgStatus === "TRIAL_EXPIRED") {
    return { valid: false, reason: "organization_inactive", consumesVisit: false };
  }
  const warnings = input.hasProfilePhoto === false ? ["profile_photo_recommended"] : [];
  if (subscription.status !== "ACTIVE") {
    return { valid: false, reason: `subscription_${subscription.status.toLowerCase()}`, consumesVisit: false };
  }
  if (subscription.startsAt && subscription.startsAt > now) {
    return { valid: false, reason: "subscription_not_started", consumesVisit: false };
  }
  if (subscription.endsAt && subscription.endsAt < now) {
    return { valid: false, reason: "subscription_expired", consumesVisit: false };
  }
  const consumesVisit = plan.type === "VISIT_PACK" || plan.type === "HYBRID" || plan.type === "TRIAL";
  if (consumesVisit && (subscription.remainingVisits ?? 0) <= 0) {
    return { valid: false, reason: "visit_pack_empty", consumesVisit, remainingVisits: subscription.remainingVisits ?? 0 };
  }
  return {
    valid: true,
    consumesVisit,
    ...(subscription.remainingVisits !== undefined ? { remainingVisits: subscription.remainingVisits } : {}),
    ...(warnings.length ? { warnings } : {})
  };
}

export function consumeVisit(
  subscription: MemberSubscription,
  plan: MembershipPlan,
  input: { alreadyCheckedInToday: boolean; multiEntryConsumes?: boolean },
): MemberSubscription {
  const consumesVisit = plan.type === "VISIT_PACK" || plan.type === "HYBRID" || plan.type === "TRIAL";
  if (!consumesVisit) {
    return subscription;
  }
  if (input.alreadyCheckedInToday && !input.multiEntryConsumes) {
    return subscription;
  }
  const remainingVisits = Math.max((subscription.remainingVisits ?? 0) - 1, 0);
  return { ...subscription, remainingVisits };
}

export function chooseRenewalStart(
  current: MemberSubscription | undefined,
  now = new Date(),
  strategy: "AFTER_CURRENT" | "IMMEDIATE" = "AFTER_CURRENT",
): Date {
  if (strategy === "IMMEDIATE" || !current?.endsAt || current.endsAt < now || current.status !== "ACTIVE") {
    return now;
  }
  return new Date(current.endsAt.getTime() + 1000);
}
