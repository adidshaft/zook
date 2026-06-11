import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { NotificationPreferenceRecord } from "@/lib/notification-preferences";
import type { PushDeviceRecord } from "@/lib/domains/shared/types";

type MyNotificationsData = { notifications: Array<Record<string, unknown>> };

export function useMyNotifications<TData = MyNotificationsData>(options?: {
  select?: (data: MyNotificationsData) => TData;
}) {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () =>
      mobileApiFetch<MyNotificationsData>("/me/notifications", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
    select: options?.select,
  });
}

export function useMyNotificationPreferences() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () =>
      mobileApiFetch<{ preferences: NotificationPreferenceRecord[] }>(
        "/me/notification-preferences",
        {
          token,
        },
      ),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useMyPushDevices() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications.pushDevices(),
    queryFn: () =>
      mobileApiFetch<{ devices: PushDeviceRecord[] }>("/me/push-devices", {
        token,
      }),
    enabled: status === "authenticated" && Boolean(token),
  });
}
