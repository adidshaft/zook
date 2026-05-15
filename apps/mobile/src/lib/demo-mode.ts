import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { QA_DEMO_ACCOUNT_EMAIL, QA_DEMO_ACCOUNT_PHONE } from "@zook/core/test-identities";
import { type AuthSessionSummary, type OrgRole } from "@zook/core";
import { isOfflineDemoMode } from "./runtime-mode";

export const DEMO_AUTH_TOKEN = "offline-demo-session";
export const DEMO_MEMBER_EMAIL = QA_DEMO_ACCOUNT_EMAIL;
export const DEMO_MEMBER_PHONE = QA_DEMO_ACCOUNT_PHONE;

export { isOfflineDemoMode };

export function getOfflineDemoSession(): AuthSessionSummary {
  const user = zookDemoFixtures.users.find((candidate) => candidate.email === DEMO_MEMBER_EMAIL) ?? zookDemoFixtures.users[0];
  const organization = zookDemoFixtures.organizations[0];
  const sessionRoles: OrgRole[] = ["MEMBER"];
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
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      }
    : undefined;

  return {
    user: {
      id: user?.id ?? "offline-demo-user",
      email: user?.email ?? DEMO_MEMBER_EMAIL,
      name: user?.name ?? "ZK",
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
