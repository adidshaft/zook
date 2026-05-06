import {
  permissionsForRoles,
  publicUserEmail,
  type AuthOrganizationSummary,
  type AuthSessionSummary,
  type Permission,
  type Role,
} from "@zook/core";
import { AuthService } from "@zook/core/services";
import { prisma } from "@zook/db";

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

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return null;
  }

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
      const roles = assignments
        .filter((assignment) => assignment.orgId === membership.orgId)
        .map((assignment) => assignment.role) as Role[];
      const permissions = resolvePermissions(
        roles,
        overrides
          .filter(
            (override) =>
              override.orgId === membership.orgId && roles.includes(override.role as Role),
          )
          .map((override) => ({
            permission: override.permission as Permission,
            enabled: override.enabled,
          })),
      );

      return {
        orgId: organization.id,
        name: organization.name,
        username: organization.username,
        status: organization.status,
        city: organization.city,
        state: organization.state,
        roles,
        permissions,
        joinedAt: membership.joinedAt,
      } satisfies AuthOrganizationSummary;
    })
    .filter((item): item is AuthOrganizationSummary => Boolean(item));

  const activeOrganization =
    summaries.find((organization) => organization.orgId === preferredOrgId) ?? summaries[0];

  return {
    user: {
      id: user.id,
      email: publicUserEmail(user.email) ?? "",
      name: user.name,
      isMinor: user.isMinor,
      guardianPending: user.guardianPending,
      isPlatformAdmin: user.isPlatformAdmin,
      marketingOptIn: user.marketingOptIn,
      aiConsent: user.aiConsent,
      preferredLocale: user.preferredLocale,
      ...(user.phone ? { phone: user.phone } : {}),
      ...(user.profilePhotoUrl ? { profilePhotoUrl: user.profilePhotoUrl } : {}),
    },
    organizations: summaries,
    ...(activeOrganization ? { activeOrgId: activeOrganization.orgId, activeOrganization } : {}),
  };
}
