import { zookDemoFixtures } from "@zook/core/demo-fixtures";
import { QA_DEMO_ACCOUNT_EMAIL, QA_DEMO_ACCOUNT_PHONE } from "@zook/core/test-identities";
import { type AuthSessionSummary, type OrgRole } from "@zook/core";
import { isOrgRole, permissionsForRoles } from "@zook/core/permissions";
import { isOfflineDemoMode } from "./runtime-mode";

export const DEMO_AUTH_TOKEN = "offline-demo-session";
export const DEMO_MEMBER_EMAIL = QA_DEMO_ACCOUNT_EMAIL;
export const DEMO_MEMBER_PHONE = QA_DEMO_ACCOUNT_PHONE;

export { isOfflineDemoMode };

const ownerViews = new Set(["command", "approvals", "revenue", "stock", "members"]);
const receptionViews = new Set(["desk", "members", "payments", "orders"]);
const trainerViews = new Set(["home", "clients", "plans", "inbox"]);

function envValue(key: string) {
  return process.env[key]?.trim();
}

export function getOfflineDemoRoleOverride(): OrgRole {
  const raw = envValue("EXPO_PUBLIC_OFFLINE_DEMO_ROLE")?.toUpperCase();
  return raw && isOrgRole(raw) ? raw : "MEMBER";
}

export function getOfflineDemoViewOverride() {
  return envValue("EXPO_PUBLIC_OFFLINE_DEMO_VIEW")?.toLowerCase();
}

export function getOfflineDemoInitialRoute(role = getOfflineDemoRoleOverride()) {
  const view = getOfflineDemoViewOverride();
  if (role === "OWNER" || role === "ADMIN") {
    return view && ownerViews.has(view) && view !== "command" ? `/owner?view=${view}` : "/owner";
  }
  if (role === "RECEPTIONIST") {
    return view && receptionViews.has(view) && view !== "desk" ? `/reception?view=${view}` : "/reception";
  }
  if (role === "TRAINER") {
    return view && trainerViews.has(view) && view !== "home" ? `/trainer?view=${view}` : "/trainer";
  }
  return "/";
}

export function getOfflineDemoSession(): AuthSessionSummary {
  const role = getOfflineDemoRoleOverride();
  const organization = zookDemoFixtures.organizations[0];
  const assignmentUserId = organization
    ? zookDemoFixtures.roleAssignments.find(
        (assignment) => assignment.orgId === organization.id && assignment.role === role,
      )?.userId
    : undefined;
  const matchedUser = assignmentUserId
    ? zookDemoFixtures.users.find((candidate) => candidate.id === assignmentUserId)
    : undefined;
  const fallbackUser =
    zookDemoFixtures.users.find((candidate) => candidate.email === DEMO_MEMBER_EMAIL) ??
    zookDemoFixtures.users[0];
  const user = matchedUser ?? fallbackUser;
  const sessionRoles: OrgRole[] = [role];
  const activeOrganization = organization
    ? {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        status: organization.status,
        city: organization.city,
        state: organization.state,
        roles: sessionRoles,
        permissions: permissionsForRoles(sessionRoles),
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
