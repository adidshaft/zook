import type { UserSafetyState } from "../types";

export function assertMinorCanUseFeature(
  user: UserSafetyState,
  feature: "JOIN_GYM" | "BUY_MEMBERSHIP" | "ATTENDANCE" | "AI_PERSONALIZATION" | "PLAN_PERSONALIZATION",
): void {
  if (user.isMinor && !user.guardianConsentGranted) {
    throw new Error(`Guardian consent required for ${feature}`);
  }
}

export function defaultNotificationPreferenceForUser(user: Pick<UserSafetyState, "isMinor" | "marketingOptIn">) {
  return {
    transactional: true,
    operational: true,
    promotional: user.isMinor ? false : user.marketingOptIn,
    engagement: user.isMinor ? false : user.marketingOptIn
  };
}
