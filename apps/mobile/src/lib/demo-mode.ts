import Constants from "expo-constants";
import { zookDemoFixtures } from "@zook/core";
import type { AuthSessionSummary, Role } from "@zook/core";

export const DEMO_AUTH_TOKEN = "offline-demo-session";
export const DEMO_MEMBER_EMAIL = "member@zook.local";

export function isOfflineDemoMode() {
  return (
    Constants.expoConfig?.extra?.offlineDemo === true ||
    process.env.EXPO_PUBLIC_OFFLINE_DEMO === "true" ||
    process.env.EXPO_PUBLIC_DEMO_MODE === "true" ||
    process.env.MOBILE_OFFLINE_DEMO === "true"
  );
}

export function getOfflineDemoSession(): AuthSessionSummary {
  const user = zookDemoFixtures.users.find((candidate) => candidate.email === DEMO_MEMBER_EMAIL) ?? zookDemoFixtures.users[0];
  const organization = zookDemoFixtures.organizations[0];
  const roles: Role[] = ["MEMBER", "TRAINER", "RECEPTIONIST", "OWNER", "ADMIN"];
  const activeOrganization = organization
    ? {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        status: organization.status,
        city: organization.city,
        state: organization.state,
        roles,
        permissions: [],
        joinedAt: new Date("2026-04-01T00:00:00.000Z"),
      }
    : undefined;

  return {
    user: {
      id: user?.id ?? "user-aarav",
      email: user?.email ?? DEMO_MEMBER_EMAIL,
      name: user?.name ?? "Aarav Mehta",
      phone: user?.phone,
      isMinor: user?.isMinor ?? false,
      guardianPending: user?.guardianPending ?? false,
      isPlatformAdmin: false,
      marketingOptIn: user?.marketingOptIn ?? true,
      aiConsent: user?.aiConsent ?? true,
    },
    organizations: activeOrganization ? [activeOrganization] : [],
    ...(activeOrganization ? { activeOrgId: activeOrganization.orgId, activeOrganization } : {}),
  };
}
