import type { OrganizationStatus, Role } from "../types";
import { canAccessPlatform } from "../permissions";

export function assertPlatformAdmin(roles: Role[], isPlatformAdmin = false): void {
  if (!canAccessPlatform(roles, isPlatformAdmin)) {
    throw new Error("Platform admin required");
  }
}

export function transitionOrganizationStatus(current: OrganizationStatus, next: OrganizationStatus): OrganizationStatus {
  if (current === "CANCELLED" && next !== "CANCELLED") {
    throw new Error("Cancelled organizations cannot be reactivated in MVP");
  }
  return next;
}
