import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  QueryErrorState,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRelativeDate } from "@/lib/formatting";
import { spacing, typography, useTheme } from "@/lib/theme";

type NotificationDetailRecord = {
  id: string;
  title?: string | null;
  body?: string | null;
  type?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

function getActionUrl(notification?: NotificationDetailRecord | null) {
  if (notification?.actionUrl) return notification.actionUrl;
  const metadataUrl = notification?.metadata?.actionUrl;
  return typeof metadataUrl === "string" ? metadataUrl : "";
}

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const notificationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { token } = useAuth();
  const { palette } = useTheme();
  const router = useRouter();
  const notificationQuery = useQuery({
    queryKey: ["me", "notifications", notificationId],
    enabled: Boolean(token && notificationId),
    queryFn: () =>
      mobileApiFetch<{ notification: NotificationDetailRecord }>(
        `/me/notifications/${notificationId}`,
        { token: token! },
      ),
  });
  const notification = notificationQuery.data?.notification ?? null;
  const actionUrl = getActionUrl(notification);

  return (
    <ZookScreen testID="notification-detail-screen">
      <AppHeader title={notification?.title ?? "Notification"} showBack />
      {notificationQuery.isLoading ? (
        <Card contentStyle={styles.stack}>
          <Skeleton width="64%" height={18} borderRadius={9} />
          <Skeleton width="100%" height={14} borderRadius={7} />
          <Skeleton width="82%" height={14} borderRadius={7} />
          <Skeleton width="44%" height={36} borderRadius={18} />
        </Card>
      ) : null}
      {notificationQuery.isError ? (
        <QueryErrorState
          error={notificationQuery.error}
          onRetry={() => void notificationQuery.refetch()}
        />
      ) : null}
      {!notificationQuery.isLoading && !notificationQuery.isError && notification ? (
        <Card contentStyle={styles.stack}>
          <View style={styles.metaRow}>
            <Text style={[styles.type, { color: palette.text.secondary }]}>
              {notification.type ?? "Notification"}
            </Text>
            {notification.createdAt ? (
              <Text style={[styles.type, { color: palette.text.tertiary }]}>
                {formatRelativeDate(notification.createdAt)}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.title, { color: palette.text.primary }]}>
            {notification.title ?? "Notification"}
          </Text>
          <Text style={[styles.body, { color: palette.text.secondary }]}>
            {notification.body ?? ""}
          </Text>
          {actionUrl ? (
            <ZookButton icon="open-outline" onPress={() => router.push(actionUrl as never)}>
              View details
            </ZookButton>
          ) : (
            <ZookButton variant="secondary" icon="arrow-back-outline" onPress={() => router.back()}>
              Back to inbox
            </ZookButton>
          )}
        </Card>
      ) : null}
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  type: typography.caption,
  title: typography.cardTitle,
  body: { ...typography.body, lineHeight: 22 },
});
