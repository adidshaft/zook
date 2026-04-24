import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatRelativeDate, titleCaseFromCode } from "@/lib/formatting";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type InboxNotification = {
  id: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  notification?: {
    title?: string | null;
    body?: string | null;
    type?: string | null;
    status?: string | null;
    createdAt?: string | null;
  } | null;
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const notificationsQuery = useMyNotifications();
  const [busyId, setBusyId] = useState<string | null>(null);
  const notifications = (notificationsQuery.data?.notifications ?? []) as InboxNotification[];
  const unread = notifications.filter((item) => !item.readAt);
  const read = notifications.filter((item) => item.readAt);

  async function markRead(id: string) {
    if (!token || busyId) {
      return;
    }
    try {
      setBusyId(id);
      await mobileApiFetch(`/me/notifications/${id}/read`, {
        method: "POST",
        token,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Member inbox"
          title="Every gym signal, without the clutter."
          subtitle="Membership updates, operational notices, plan nudges, and security messages live in one calm feed."
        />

        <View style={styles.metricGrid}>
          <MetricTile
            label="Unread"
            value={String(unread.length)}
            detail={
              unread.length ? "Tap any unread card to mark it opened." : "You are fully caught up."
            }
            tone={unread.length ? "amber" : "lime"}
          />
          <MetricTile
            label="Latest delivery"
            value={
              notifications[0]?.notification?.createdAt
                ? formatRelativeDate(notifications[0].notification?.createdAt)
                : "No activity"
            }
            detail={
              notifications[0]?.notification?.title ?? "Notifications will appear here when sent."
            }
            tone="blue"
          />
        </View>

        {notificationsQuery.isLoading ? (
          <LoadingState
            title="Loading notification center"
            body="Pulling the latest messages sent to your account."
          />
        ) : null}

        {!notificationsQuery.isLoading && !notifications.length ? (
          <EmptyState
            title="No notifications yet"
            body="The inbox will start filling once your gym sends operational updates, plan messages, or transactional alerts."
          />
        ) : null}

        {unread.length ? (
          <>
            <SectionHeader
              eyebrow="Needs attention"
              title="Unread now"
              subtitle="Unread cards stay highlighted until you open them."
            />
            <View style={styles.list}>
              {unread.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onPress={() => void markRead(item.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {read.length ? (
          <>
            <SectionHeader
              eyebrow="History"
              title="Read recently"
              subtitle="Recent alerts remain visible so members can revisit key details without asking the front desk."
            />
            <View style={styles.list}>
              {read.map((item) => (
                <NotificationCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onPress={() => void markRead(item.id)}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function NotificationCard({
  item,
  busy,
  onPress,
}: {
  item: InboxNotification;
  busy: boolean;
  onPress: () => void;
}) {
  const notification = item.notification;
  const unread = !item.readAt;

  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, unread ? styles.cardUnread : null]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderCopy}>
            <View style={styles.titleRow}>
              <Text style={styles.title} selectable>
                {notification?.title ?? "Notification"}
              </Text>
              <Pill tone={toneForNotification(notification?.type)}>
                {titleCaseFromCode(notification?.type ?? "INFO")}
              </Pill>
            </View>
            <Text style={styles.body} selectable>
              {notification?.body ?? "No body available."}
            </Text>
          </View>
          <Pill tone={unread ? "lime" : "neutral"}>
            {busy ? "Opening..." : unread ? "Unread" : "Read"}
          </Pill>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta} selectable>
            {notification?.createdAt ? formatDateTime(notification.createdAt) : "No timestamp"}
          </Text>
          <Text style={styles.meta} selectable>
            {item.readAt ? `Read ${formatRelativeDate(item.readAt)}` : "Tap to mark opened"}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

function toneForNotification(type?: string | null) {
  if (type === "SECURITY") {
    return "red" as const;
  }
  if (type === "PLAN") {
    return "blue" as const;
  }
  if (type === "OPERATIONAL") {
    return "amber" as const;
  }
  if (type === "TRANSACTIONAL") {
    return "lime" as const;
  }
  return "violet" as const;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    gap: 14,
  },
  cardUnread: {
    borderColor: "rgba(185,244,85,0.24)",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 10,
  },
  titleRow: {
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    lineHeight: 21,
  },
  metaRow: {
    gap: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
});
