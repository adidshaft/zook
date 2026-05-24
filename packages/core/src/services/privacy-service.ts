import type { UserSafetyState } from "../types";

export function assertMinorCanUseFeature(
  user: UserSafetyState,
  feature: "JOIN_GYM" | "BUY_MEMBERSHIP" | "ATTENDANCE" | "AI_PERSONALIZATION" | "PLAN_PERSONALIZATION",
): void {
  void user;
  void feature;
}

export function defaultNotificationPreferenceForUser(user: Pick<UserSafetyState, "isMinor" | "marketingOptIn">) {
  return {
    transactional: true,
    operational: true,
    promotional: user.marketingOptIn,
    engagement: user.marketingOptIn
  };
}
