"use client";

import posthog from "posthog-js";

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

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";
let initialized = false;

export function initAnalytics() {
  if (initialized || !posthogKey || typeof window === "undefined") {
    return;
  }
  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function setAnalyticsConsent(enabled: boolean) {
  initAnalytics();
  if (!initialized) {
    return;
  }
  if (enabled) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function identifyAnalyticsUser(userId?: string | null) {
  initAnalytics();
  if (!initialized || !userId || posthog.has_opted_out_capturing()) {
    return;
  }
  posthog.identify(userId);
}

export function trackEvent(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  initAnalytics();
  if (!initialized || posthog.has_opted_out_capturing()) {
    return;
  }
  posthog.capture(event, properties);
}
