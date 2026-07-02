import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { mapNotificationPayloadToHref } from "@/lib/notification-routing";
import { typography, useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export type InboxNotification = {
  id: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  notification?: {
    id?: string | null;
    title?: string | null;
    body?: string | null;
    type?: string | null;
    status?: string | null;
    createdAt?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

export function iconForNotificationType(type?: string | null): keyof typeof Ionicons.glyphMap {
  if (type === "SECURITY") return "shield-outline";
  if (type === "PLAN") return "barbell-outline";
  if (type === "OPERATIONAL") return "settings-outline";
  if (type === "TRANSACTIONAL") return "card-outline";
  if (type === "ENGAGEMENT") return "heart-outline";
  return "notifications-outline";
}

export function toneForNotificationType(type?: string | null) {
  if (type === "SECURITY") return "red" as const;
  if (type === "PLAN") return "blue" as const;
  if (type === "OPERATIONAL") return "amber" as const;
  if (type === "TRANSACTIONAL") return "lime" as const;
  return "violet" as const;
}

function formatInboxRowDate(
  value: string | null | undefined,
  t: ReturnType<typeof useI18n>["t"],
  locale?: string,
) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) {
    return t("notifications.timeNow");
  }
  if (diffMinutes < 60) {
    return t("notifications.timeMinutes", { count: diffMinutes });
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("notifications.timeHours", { count: diffHours });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return t("notifications.timeDays", { count: diffDays });
  }
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function NotificationRow({
  item,
  busy,
  first,
  highlighted,
  onPress,
}: {
  item: InboxNotification;
  busy: boolean;
  first: boolean;
  highlighted: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const { locale, t } = useI18n();
  const notification = item.notification;
  const unread = !item.readAt;
  const type = notification?.type;
  const href = mapNotificationPayloadToHref({
    notificationId: notification?.id ?? item.id,
    type,
    ...(notification?.metadata ?? {}),
  });
  const opensRoute = !href.startsWith("/notifications");

  return (
    <Pressable
      testID={first ? "notification-row-first" : `notification-row-${item.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification?.title ?? t("notifications.fallbackTitle")}
      accessibilityState={{ busy }}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <View
        style={[
          styles.notificationContent,
          {
            backgroundColor: highlighted ? palette.bg.sunken : "transparent",
            borderColor: highlighted ? palette.border.subtle : "transparent",
          },
          unread ? null : styles.notificationReadContent,
        ]}
      >
        <View style={styles.notificationRow}>
          <View style={styles.notificationStatusColumn}>
            {unread ? (
              <View
                style={[
                  styles.notificationUnreadDot,
                  { backgroundColor: palette.accent.base },
                ]}
              />
            ) : null}
            <Ionicons
              name={iconForNotificationType(type)}
              size={13}
              color={
                highlighted
                  ? palette.text.primary
                  : unread
                    ? palette.accent.base
                    : palette.text.secondary
              }
            />
          </View>
          <View style={styles.notificationCopy}>
            <View style={styles.notificationTitleRow}>
              <Text numberOfLines={1} style={[styles.notificationTitle, { color: palette.text.primary }]}>
                {notification?.title ?? t("notifications.fallbackTitle")}
              </Text>
              <Text numberOfLines={1} style={[styles.notificationTime, { color: palette.text.tertiary }]}>
                {notification?.createdAt ? formatInboxRowDate(notification.createdAt, t, locale) : ""}
                {busy ? t("notifications.openingSuffix") : ""}
              </Text>
            </View>
            {notification?.body ? (
              <Text numberOfLines={1} style={[styles.notificationBody, { color: palette.text.secondary }]}>
                {notification.body}
              </Text>
            ) : null}
          </View>
          {opensRoute ? (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={palette.text.secondary}
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  notificationContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  notificationReadContent: {
    opacity: 0.68,
  },
  notificationRow: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  notificationStatusColumn: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  notificationUnreadDot: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  notificationCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    flex: 1,
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  notificationBody: {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
    lineHeight: 14,
  },
  notificationTime: {
    ...typography.small,
    flexShrink: 0,
    maxWidth: 78,
  },
});
