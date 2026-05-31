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

export function serializeOrganizationForReadModel<T extends object | null | undefined>(organization: T) {
  if (!organization) {
    return organization;
  }
  const location = organization as { latitude?: unknown; longitude?: unknown };
  return {
    ...organization,
    latitude:
      location.latitude === null || location.latitude === undefined
        ? null
        : Number(location.latitude),
    longitude:
      location.longitude === null || location.longitude === undefined
        ? null
        : Number(location.longitude),
  };
}
