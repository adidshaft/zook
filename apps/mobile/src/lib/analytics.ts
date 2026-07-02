import Constants from "expo-constants";
import PostHog from "posthog-react-native";

import { getStoredValue, setStoredValue } from "./storage";

export type AnalyticsEvent =
  | "auth_otp_requested"
  | "auth_signed_in"
  | "member_checked_in"
  | "workout_completed"
  | "membership_purchase_started"
  | "membership_purchase_succeeded"
  | "shop_order_placed"
  | "class_booked"
  | "referral_shared"
  | "owner_member_added"
  | "owner_payment_recorded";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const analyticsConsentStorageKey = "zook_analytics_consent";
const posthogHost = "https://eu.i.posthog.com";

function readConfigValue(key: string) {
  const extra = Constants.expoConfig?.extra ?? {};
  const value = extra[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : process.env[`EXPO_PUBLIC_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`]?.trim();
}

const posthogKey = readConfigValue("posthogKey");
const posthog = posthogKey
  ? new PostHog(posthogKey, {
      host: readConfigValue("posthogHost") ?? posthogHost,
      disabled: true,
    })
  : null;

export async function getAnalyticsConsent() {
  const stored = await getStoredValue(analyticsConsentStorageKey);
  return stored !== "0";
}

export async function setAnalyticsConsent(enabled: boolean) {
  await setStoredValue(analyticsConsentStorageKey, enabled ? "1" : "0");
  if (!posthog) {
    return;
  }
  if (enabled) {
    await posthog.optIn();
  } else {
    await posthog.optOut();
  }
}

export async function hydrateAnalyticsConsent() {
  await setAnalyticsConsent(await getAnalyticsConsent());
}

export async function identifyAnalyticsUser(userId?: string | null) {
  if (!posthog || !userId || !(await getAnalyticsConsent())) {
    return;
  }
  posthog.identify(userId);
}

export async function trackEvent(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (!posthog || !(await getAnalyticsConsent())) {
    return;
  }
  const cleanProperties = Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, string | number | boolean] => {
      const value = entry[1];
      return value !== null && value !== undefined;
    }),
  );
  posthog.capture(event, cleanProperties);
}
