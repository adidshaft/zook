import {
  isOrgRole,
  permissionsForRoles,
  publicUserEmail,
  type AuthOrganizationSummary,
  type AuthSessionSummary,
  type OrgRole,
  type Permission,
  type Role,
} from "@zook/core";
import { AuthService } from "@zook/core/services";
import { prisma } from "@zook/db";
import { ensureMemberSlugForUser } from "./member-slug";
import { privateUserHandle } from "./private-user-handle";

function resolvePermissions(
  roles: Role[],
  overrides: Array<{ permission: Permission; enabled: boolean }>,
): Permission[] {
  const permissions = new Set<Permission>(permissionsForRoles(roles));
  for (const override of overrides) {
    if (override.enabled) {
      permissions.add(override.permission);
      continue;
    }
    permissions.delete(override.permission);
  }
  return Array.from(permissions);
}

const activeOrganizationRolePriority: OrgRole[] = [
  "OWNER",
  "ADMIN",
  "RECEPTIONIST",
  "TRAINER",
  "MEMBER",
];

const failClosedRolePriority: OrgRole[] = ["MEMBER", "TRAINER", "RECEPTIONIST", "ADMIN", "OWNER"];

function resolveEffectiveOrgRoles(roles: Role[]): OrgRole[] {
  const orgRoleSet = new Set(roles.filter(isOrgRole));
  if (orgRoleSet.size <= 1) {
    return Array.from(orgRoleSet);
  }
  const leastPrivilegedRole = failClosedRolePriority.find((role) => orgRoleSet.has(role));
  return leastPrivilegedRole ? [leastPrivilegedRole] : [];
}

function rolePriorityScore(roles: Role[]) {
  const match = activeOrganizationRolePriority.findIndex((role) => roles.includes(role));
  return match === -1 ? activeOrganizationRolePriority.length : match;
}

function resolveActiveOrganization(summaries: AuthOrganizationSummary[], preferredOrgId?: string) {
  const preferred = summaries.find((organization) => organization.orgId === preferredOrgId);
  if (preferred) {
    return preferred;
  }
  return summaries.slice().sort((left, right) => {
    const priorityDelta = rolePriorityScore(left.roles) - rolePriorityScore(right.roles);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
  })[0];
}

export async function resolveSessionSummaryFromToken(
  token: string | undefined,
  preferredOrgId?: string,
): Promise<AuthSessionSummary | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: AuthService.hash(token) },
  });

  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return null;
  }

  const impersonation = session.impersonationSessionId
    ? await prisma.impersonationSession.findUnique({
        where: { id: session.impersonationSessionId },
      })
    : null;
  if (
    session.impersonationSessionId &&
    (!impersonation || impersonation.endedAt || impersonation.expiresAt <= new Date())
  ) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return null;
  }

  const userSlug = await ensureMemberSlugForUser(user);

  const organizationUsers = await prisma.organizationUser.findMany({
    where: { userId: user.id, status: "active" },
    orderBy: { joinedAt: "asc" },
  });
  const orgIds = organizationUsers.map((item) => item.orgId);

  const [organizations, assignments, overrides] = await Promise.all([
    prisma.organization.findMany({ where: { id: { in: orgIds } } }),
    prisma.organizationRoleAssignment.findMany({
      where: { userId: user.id, orgId: { in: orgIds } },
    }),
    prisma.organizationRolePermission.findMany({ where: { orgId: { in: orgIds } } }),
  ]);

  const organizationsById = new Map(organizations.map((org) => [org.id, org]));

  const summaries = organizationUsers
    .map((membership) => {
      const organization = organizationsById.get(membership.orgId);
      if (!organization) {
        return null;
      }
      const roles = resolveEffectiveOrgRoles(
        assignments
          .filter((assignment) => assignment.orgId === membership.orgId)
          .map((assignment) => assignment.role)
          .filter(isOrgRole),
      );
      const permissions = resolvePermissions(
        roles,
        overrides
          .filter(
            (override) =>
              override.orgId === membership.orgId &&
              isOrgRole(override.role) &&
              roles.includes(override.role),
          )
          .map((override) => ({
            permission: override.permission as Permission,
            enabled: override.enabled,
          })),
      );

      const summary: AuthOrganizationSummary = {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        logoUrl: organization.logoUrl,
        status: organization.status,
        city: organization.city,
        state: organization.state,
        roles,
        permissions,
        joinedAt: membership.joinedAt,
      };
      return summary;
    })
    .filter((item): item is AuthOrganizationSummary => Boolean(item));

  const activeOrganization = resolveActiveOrganization(summaries, preferredOrgId);

  const originalUser = session.originalUserId
    ? await prisma.user.findUnique({ where: { id: session.originalUserId } })
    : null;

  return {
    user: {
      id: user.id,
      email: publicUserEmail(user.email) ?? "",
      name: user.name,
      slug: userSlug,
      privateHandle: privateUserHandle(user.id),
      dateOfBirth: user.dateOfBirth,
      isMinor: user.isMinor,
      guardianPending: user.guardianPending,
      isPlatformAdmin: user.isPlatformAdmin,
      marketingOptIn: user.marketingOptIn,
      aiConsent: user.aiConsent,
      preferredLocale: user.preferredLocale,
      weeklyWorkoutGoal: user.weeklyWorkoutGoal,
      ...(user.phone ? { phone: user.phone } : {}),
      ...(user.profilePhotoUrl ? { profilePhotoUrl: user.profilePhotoUrl } : {}),
    },
    ...(originalUser
      ? {
          originalUser: {
            id: originalUser.id,
            email: publicUserEmail(originalUser.email) ?? "",
            name: originalUser.name,
            slug: originalUser.slug,
            privateHandle: privateUserHandle(originalUser.id),
            dateOfBirth: originalUser.dateOfBirth,
            isMinor: originalUser.isMinor,
            guardianPending: originalUser.guardianPending,
            isPlatformAdmin: originalUser.isPlatformAdmin,
            marketingOptIn: originalUser.marketingOptIn,
            aiConsent: originalUser.aiConsent,
            preferredLocale: originalUser.preferredLocale,
            weeklyWorkoutGoal: originalUser.weeklyWorkoutGoal,
            ...(originalUser.phone ? { phone: originalUser.phone } : {}),
            ...(originalUser.profilePhotoUrl ? { profilePhotoUrl: originalUser.profilePhotoUrl } : {}),
          },
        }
      : {}),
    ...(impersonation
      ? {
          impersonation: {
            id: impersonation.id,
            targetUserId: impersonation.targetUserId,
            platformAdminUserId: impersonation.platformAdminUserId,
            reason: impersonation.reason,
            startedAt: impersonation.startedAt,
            expiresAt: impersonation.expiresAt,
          },
        }
      : {}),
    organizations: summaries,
    ...(activeOrganization ? { activeOrgId: activeOrganization.orgId, activeOrganization } : {}),
  };
}
