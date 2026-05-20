import type { AuthSessionSummary, OrgRole } from "@zook/core";

export const DEMO_AUTH_TOKEN = "offline-demo-session";
export const DEMO_MEMBER_EMAIL = "member@zook.local";
export const DEMO_MEMBER_PHONE = "+91 98765 43210";

export function isOfflineDemoMode() {
  return false;
}

export function explicitOfflineDemoRoleOverride(): OrgRole | undefined {
  return undefined;
}

export function getOfflineDemoRoleOverride(): OrgRole {
  return "MEMBER";
}

export function getOfflineDemoViewOverride() {
  return undefined;
}

export function getOfflineDemoInitialRoute() {
  return "/";
}

export function getOfflineDemoSession(): AuthSessionSummary {
  throw new Error("Demo data is not included in this build.");
}
