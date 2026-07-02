import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  ScreenHeader,
  QueryErrorState,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFormatters } from "@/lib/formatting-i18n";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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
  const t = useT();
  const { formatRelativeDate } = useFormatters();
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
  const fallbackTitle = t("notifications.fallbackTitle");
  const resolvedTitle = notification?.title ?? fallbackTitle;
  const typeLabel = notification?.type ? notification.type.replace(/_/g, " ") : null;

  return (
    <ZookScreen testID="notification-detail-screen">
      <View style={styles.content}>
        <ScreenHeader title={fallbackTitle} showBack />
      {notificationQuery.isLoading ? (
        <View style={styles.stack}>
          <Skeleton width="64%" height={18} borderRadius={9} />
          <Skeleton width="100%" height={14} borderRadius={7} />
          <Skeleton width="82%" height={14} borderRadius={7} />
          <Skeleton width="44%" height={36} borderRadius={18} />
        </View>
      ) : null}
      {notificationQuery.isError ? (
        <QueryErrorState
          error={notificationQuery.error}
          onRetry={() => void notificationQuery.refetch()}
        />
      ) : null}
      {!notificationQuery.isLoading && !notificationQuery.isError && notification ? (
        <View style={styles.messageSurface}>
          <Text style={[styles.title, { color: palette.text.primary }]}>
            {resolvedTitle}
          </Text>
          {typeLabel || notification.createdAt ? (
            <View style={styles.metaRow}>
              {typeLabel ? (
                <View style={[styles.metaChip, { backgroundColor: palette.bg.sunken }]}>
                  <Ionicons name="notifications-outline" size={13} color={palette.text.secondary} />
                  <Text numberOfLines={1} style={[styles.type, { color: palette.text.secondary }]}>
                    {typeLabel}
                  </Text>
                </View>
              ) : null}
              {notification.createdAt ? (
                <View style={[styles.metaChip, { backgroundColor: palette.bg.sunken }]}>
                  <Ionicons name="time-outline" size={13} color={palette.text.tertiary} />
                  <Text numberOfLines={1} style={[styles.type, { color: palette.text.tertiary }]}>
                    {formatRelativeDate(notification.createdAt)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {notification.body ? (
            <Text style={[styles.body, { color: palette.text.secondary }]}>
              {notification.body}
            </Text>
          ) : (
            <Text style={[styles.body, { color: palette.text.secondary }]}>
              {t("notifications.noDetails")}
            </Text>
          )}
          {actionUrl ? (
            <ZookButton icon="open-outline" onPress={() => router.push(actionUrl as never)}>
              {t("notifications.openLinkedScreen")}
            </ZookButton>
          ) : (
            <ZookButton variant="secondary" icon="arrow-back-outline" onPress={() => router.back()}>
              {t("notifications.backToInbox")}
            </ZookButton>
          )}
        </View>
      ) : null}
      </View>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    gap: spacing.lg,
    paddingTop: layout.screenContentTopPadding,
    paddingBottom: layout.bottomNavContentPadding,
  },
  stack: { gap: spacing.md, paddingHorizontal: layout.screenPadding },
  messageSurface: {
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaChip: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    maxWidth: "100%",
    minHeight: 26,
    paddingHorizontal: 9,
  },
  title: {
    ...typography.headerTitle,
  },
  type: typography.caption,
  body: { ...typography.body, lineHeight: 22 },
});
