import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, Screen } from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMyNotifications } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type InboxNotification = {
  id: string;
  readAt?: string | null;
  notification?: {
    title?: string | null;
    body?: string | null;
    type?: string | null;
    createdAt?: string | null;
  } | null;
};

export default function NotificationsScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const notificationsQuery = useMyNotifications();
  const [busyId, setBusyId] = useState<string | null>(null);
  const notifications = (notificationsQuery.data?.notifications ?? []) as InboxNotification[];

  async function markRead(id: string) {
    if (!token || busyId) {
      return;
    }
    try {
      setBusyId(id);
      await mobileApiFetch(`/me/notifications/${id}/read`, {
        method: "POST",
        token
      });
      await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "home"] });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen title="Notifications">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {notificationsQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading notification center...</Text>
          </Card>
        ) : null}
        {!notificationsQuery.isLoading && !notifications.length ? (
          <Card>
            <Text style={styles.body}>No notifications yet.</Text>
          </Card>
        ) : null}
        {notifications.map((item) => {
          const notification = item.notification;
          const unread = !item.readAt;
          return (
            <Pressable key={item.id} onPress={() => void markRead(item.id)}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{notification?.title ?? "Notification"}</Text>
                    <Text style={styles.body}>{notification?.body ?? "No body available."}</Text>
                    <Text style={styles.meta}>
                      {notification?.type ?? "INFO"}
                      {notification?.createdAt
                        ? ` · ${new Date(notification.createdAt).toLocaleString()}`
                        : ""}
                    </Text>
                  </View>
                  <Pill tone={unread ? "lime" : "neutral"}>
                    {busyId === item.id ? "Opening..." : unread ? "Unread" : "Read"}
                  </Pill>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 120 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 10 }
});
