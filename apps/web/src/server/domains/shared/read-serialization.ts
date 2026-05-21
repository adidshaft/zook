import { publicUserEmail } from "@zook/core";
import { privateUserHandle } from "@/server/private-user-handle";

export function serializeUserForReadModel<T extends { id: string; email: string } | null | undefined>(
  user: T,
) {
  if (!user) {
    return user;
  }
  return {
    ...user,
    email: publicUserEmail(user.email) ?? "",
    privateHandle: privateUserHandle(user.id),
  };
}

export function serializeOrganizationForReadModel<
  T extends { latitude?: unknown; longitude?: unknown } | null | undefined,
>(organization: T) {
  if (!organization) {
    return organization;
  }
  return {
    ...organization,
    latitude:
      organization.latitude === null || organization.latitude === undefined
        ? null
        : Number(organization.latitude),
    longitude:
      organization.longitude === null || organization.longitude === undefined
        ? null
        : Number(organization.longitude),
  };
}
