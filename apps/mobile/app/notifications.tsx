import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/domain-api";
import { formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import { mapNotificationPayloadToHref } from "@/lib/notification-routing";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type InboxNotification = {
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

function iconForType(type?: string | null): keyof typeof Ionicons.glyphMap {
  if (type === "SECURITY") return "shield-outline";
  if (type === "PLAN") return "barbell-outline";
  if (type === "OPERATIONAL") return "settings-outline";
  if (type === "TRANSACTIONAL") return "card-outline";
  if (type === "ENGAGEMENT") return "sparkles-outline";
  return "notifications-outline";
}

function toneForType(type?: string | null) {
  if (type === "SECURITY") return "red" as const;
  if (type === "PLAN") return "blue" as const;
  if (type === "OPERATIONAL") return "amber" as const;
  if (type === "TRANSACTIONAL") return "lime" as const;
  return "violet" as const;
}

function groupByDate(items: InboxNotification[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const groups: Array<{ label: string; items: InboxNotification[] }> = [];
  const buckets: Record<string, InboxNotification[]> = {};

  for (const item of items) {
    const dateKey = item.notification?.createdAt?.slice(0, 10) ?? "unknown";
    if (!buckets[dateKey]) {
      buckets[dateKey] = [];
    }
    buckets[dateKey].push(item);
  }

  for (const [key, bucketItems] of Object.entries(buckets)) {
    let label = key;
    if (key === todayKey) label = "Today";
    else if (key === yesterdayKey) label = "Yesterday";
    else label = new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    groups.push({ label, items: bucketItems });
  }

  return groups;
}

export default function NotificationsScreen() {
  const routeParams = useLocalSearchParams<{ focus?: string; notificationId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const notificationsQuery = useMyNotifications();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const notifications = (notificationsQuery.data?.notifications ?? []) as InboxNotification[];
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  async function markRead(id: string) {
    if (!token || busyId) {
      return;
    }
    try {
      setBusyId(id);
      await notificationsApi.markRead({ id, token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!token || busyId) return;
    const unread = notifications.filter((item) => !item.readAt);
    for (const item of unread) {
      try {
        await notificationsApi.markRead({ id: item.id, token });
      } catch {
        // continue marking others
      }
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
    ]);
  }

  async function openNotification(item: InboxNotification) {
    await markRead(item.id);
    const href = mapNotificationPayloadToHref({
      notificationId: item.notification?.id,
      type: item.notification?.type,
      ...(item.notification?.metadata ?? {}),
    });
    if (!href.startsWith("/notifications")) {
      router.push(href as never);
    }
  }

  useEffect(() => {
    const matchingUnread = notifications.find(
      (item) => item.notification?.id === routeParams.notificationId && !item.readAt,
    );
    if (matchingUnread) {
      void markRead(matchingUnread.id);
    }
  }, [notifications, routeParams.notificationId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
    setRefreshing(false);
  };

  const dateGroups = groupByDate(notifications);

  return (
    <>
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <MobileHeader
            title="Inbox"
            subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            trailing={
              unreadCount > 0 ? (
                <Pressable
                  onPress={() => void markAllRead()}
                  accessibilityRole="button"
                  accessibilityLabel="Mark all read"
                  style={styles.markAllButton}
                >
                  <Ionicons name="checkmark-done" size={18} color={colors.lime} />
                </Pressable>
              ) : null
            }
          />

          {routeParams.notificationId ? (
            <GlassCard variant="selected" contentStyle={styles.calloutContent}>
              <IconBubble icon="notifications" tone="blue" size={36} />
              <Text style={styles.calloutText}>
                {routeParams.focus === "attendance" ? "Attendance alert received" : "Opened from push notification"}
              </Text>
            </GlassCard>
          ) : null}

          {/* Summary bar */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, unreadCount > 0 ? styles.summaryChipActive : null]}>
              <Text style={styles.summaryValue}>{unreadCount}</Text>
              <Text style={styles.summaryLabel}>unread</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{notifications.length}</Text>
              <Text style={styles.summaryLabel}>total</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>
                {notifications[0]?.notification?.createdAt
                  ? formatRelativeDate(notifications[0].notification.createdAt)
                  : "—"}
              </Text>
              <Text style={styles.summaryLabel}>latest</Text>
            </View>
          </View>

          {notificationsQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <IconBubble icon="hourglass-outline" tone="amber" size={36} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </GlassCard>
          ) : null}

          {!notificationsQuery.isLoading && !notifications.length ? (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="notifications-off-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyBody}>Gym updates, payment alerts, and plan messages will appear here.</Text>
              </View>
            </GlassCard>
          ) : null}

          {/* Grouped notifications */}
          {dateGroups.map((group) => (
            <View key={group.label} style={styles.dateGroup}>
              <Text style={styles.dateGroupLabel}>{group.label}</Text>
              <View style={styles.list}>
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    highlighted={item.notification?.id === routeParams.notificationId}
                    onPress={() => void openNotification(item)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function NotificationRow({
  item,
  busy,
  highlighted,
  onPress,
}: {
  item: InboxNotification;
  busy: boolean;
  highlighted: boolean;
  onPress: () => void;
}) {
  const notification = item.notification;
  const unread = !item.readAt;
  const type = notification?.type;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification?.title ?? "Notification"}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <GlassCard
        variant={highlighted ? "selected" : unread ? "default" : "compact"}
        contentStyle={styles.notificationContent}
      >
        <View style={styles.notificationRow}>
          <IconBubble icon={iconForType(type)} tone={toneForType(type)} size={40} />
          <View style={styles.notificationCopy}>
            <View style={styles.notificationTitleRow}>
              <Text numberOfLines={1} style={styles.notificationTitle}>
                {notification?.title ?? "Notification"}
              </Text>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text numberOfLines={2} style={styles.notificationBody}>
              {notification?.body ?? "No details available."}
            </Text>
            <Text style={styles.notificationTime}>
              {notification?.createdAt
                ? formatRelativeDate(notification.createdAt)
                : ""}
              {busy ? " · Opening..." : ""}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calloutText: {
    flex: 1,
    color: colors.text,
    ...typography.bodyStrong,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryChip: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "center",
    gap: 2,
  },
  summaryChipActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.06)",
  },
  summaryValue: {
    color: colors.text,
    ...typography.cardTitle,
  },
  summaryLabel: {
    color: colors.muted,
    ...typography.small,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.muted,
    ...typography.body,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  dateGroup: {
    gap: 8,
  },
  dateGroupLabel: {
    color: colors.muted,
    ...typography.caption,
    paddingHorizontal: 4,
  },
  list: {
    gap: 8,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  notificationContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notificationRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    flex: 1,
    color: colors.text,
    ...typography.cardTitle,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  notificationBody: {
    color: colors.muted,
    ...typography.body,
  },
  notificationTime: {
    color: colors.subtle,
    ...typography.small,
    marginTop: 2,
  },
});
