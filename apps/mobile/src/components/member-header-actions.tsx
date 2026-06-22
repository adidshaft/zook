import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProfileShortcut } from "@/components/primitives";
import { useMyNotifications } from "@/lib/domains/notifications";
import { spacing, useTheme } from "@/lib/theme";

/**
 * Top-right header cluster for member tab screens: a notification bell (with
 * unread badge) and the profile avatar. Replaces the former "You" tab as the
 * entry point to notifications and the account hub.
 */
export function MemberHeaderActions({ showBell = true }: { showBell?: boolean }) {
  const router = useRouter();
  const { palette } = useTheme();
  const unreadQuery = useMyNotifications({
    select: (data) => data.notifications.filter((n) => !n.readAt).length,
  });
  const unread = unreadQuery.data ?? 0;

  return (
    <View style={styles.row}>
      {showBell ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
          hitSlop={8}
          onPress={() => router.push("/notifications" as never)}
          style={({ pressed }) => [
            styles.bell,
            { backgroundColor: palette.surface.default, borderColor: palette.border.subtle },
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="notifications-outline" size={20} color={palette.text.primary} />
          {unread > 0 ? (
            <View style={[styles.badge, { backgroundColor: palette.feedback.danger, borderColor: palette.bg.app }]}>
              <Text style={[styles.badgeText, { color: palette.text.onDanger }]}>
                {unread > 9 ? "9+" : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      <ProfileShortcut />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  bell: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  badge: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: 4,
    top: 3,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 10, lineHeight: 12 },
});
