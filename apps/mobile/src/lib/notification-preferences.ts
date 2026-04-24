export interface NotificationPreferenceRecord {
  id?: string;
  orgId?: string | null;
  transactional?: boolean;
  operational?: boolean;
  promotional?: boolean;
  engagement?: boolean;
  pushEnabled?: boolean;
  updatedAt?: string;
}

export interface EffectiveNotificationPreferences {
  transactional: boolean;
  operational: boolean;
  promotional: boolean;
  engagement: boolean;
  pushEnabled: boolean;
  scope: "default" | "global" | "organization";
}

export const defaultNotificationPreferences: EffectiveNotificationPreferences = {
  transactional: true,
  operational: true,
  promotional: true,
  engagement: true,
  pushEnabled: false,
  scope: "default"
};

export function mergeNotificationPreferences(
  preferences: NotificationPreferenceRecord[] | null | undefined,
  activeOrgId?: string
): EffectiveNotificationPreferences {
  const globalPreference =
    preferences?.find((preference) => !preference.orgId) ?? null;
  const organizationPreference =
    activeOrgId
      ? preferences?.find((preference) => preference.orgId === activeOrgId) ?? null
      : null;

  if (organizationPreference) {
    return {
      transactional: organizationPreference.transactional ?? globalPreference?.transactional ?? true,
      operational: organizationPreference.operational ?? globalPreference?.operational ?? true,
      promotional: organizationPreference.promotional ?? globalPreference?.promotional ?? true,
      engagement: organizationPreference.engagement ?? globalPreference?.engagement ?? true,
      pushEnabled: organizationPreference.pushEnabled ?? globalPreference?.pushEnabled ?? false,
      scope: "organization"
    };
  }

  if (globalPreference) {
    return {
      transactional: globalPreference.transactional ?? true,
      operational: globalPreference.operational ?? true,
      promotional: globalPreference.promotional ?? true,
      engagement: globalPreference.engagement ?? true,
      pushEnabled: globalPreference.pushEnabled ?? false,
      scope: "global"
    };
  }

  return defaultNotificationPreferences;
}
