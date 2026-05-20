import { useMemo } from "react";
import type {
  AuthOrganizationSummary,
  AuthSessionUser,
  Permission,
  Role,
} from "@zook/core";

import { useAuth } from "./auth";
import { isOfflineDemoMode } from "./runtime-mode";

export type RoleContext = {
  user: AuthSessionUser;
  org: AuthOrganizationSummary | null;
  availableRoles: Role[];
  role: Role;
  permissions: ReadonlySet<Permission>;
  isPlatformAdmin: boolean;
  isDemo: boolean;
};

export function useRoleContext(): RoleContext | null {
  const { activeOrgId, activeRole, session } = useAuth();

  return useMemo(() => {
    if (!session?.user) {
      return null;
    }

    const org =
      session.activeOrganization ??
      session.organizations.find((organization) => organization.orgId === activeOrgId) ??
      session.organizations[0] ??
      null;
    const availableRoles = (org?.roles ?? []) as Role[];
    const role =
      activeRole ??
      availableRoles[0] ??
      (session.user.isPlatformAdmin ? "PLATFORM_ADMIN" : "MEMBER");

    return {
      user: session.user,
      org,
      availableRoles,
      role,
      permissions: new Set<Permission>((org?.permissions ?? []) as Permission[]),
      isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
      isDemo: isOfflineDemoMode(),
    };
  }, [activeOrgId, activeRole, session]);
}

export function useCanSwitchRole() {
  const ctx = useRoleContext();
  return (ctx?.availableRoles.length ?? 0) > 1;
}
