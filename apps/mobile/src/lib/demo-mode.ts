import { QA_DEMO_ACCOUNT_EMAIL, QA_DEMO_ACCOUNT_PHONE, zookDemoFixtures } from "@zook/core";
import { type AuthSessionSummary, type Role } from "@zook/core";
import { isOfflineDemoMode } from "./runtime-mode";

export const DEMO_AUTH_TOKEN = "offline-demo-session";
export const DEMO_MEMBER_EMAIL = QA_DEMO_ACCOUNT_EMAIL;
export const DEMO_MEMBER_PHONE = QA_DEMO_ACCOUNT_PHONE;

export { isOfflineDemoMode };

export function getOfflineDemoSession(): AuthSessionSummary {
  const user = zookDemoFixtures.users.find((candidate) => candidate.email === DEMO_MEMBER_EMAIL) ?? zookDemoFixtures.users[0];
  const organization = zookDemoFixtures.organizations[0];
  const sessionRoles: Role[] = ["MEMBER"];
  const activeOrganization = organization
    ? {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        status: organization.status,
        city: organization.city,
        state: organization.state,
        roles: sessionRoles,
        permissions: [],
        joinedAt: new Date("2026-04-01T00:00:00.000Z"),
      }
    : undefined;

  return {
    user: {
      id: user?.id ?? "offline-demo-user",
      email: user?.email ?? DEMO_MEMBER_EMAIL,
      name: user?.name ?? "Nisha Menon",
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
