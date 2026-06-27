import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useMyNotifications } from "@/lib/domains/notifications";
import { spacing, useTheme } from "@/lib/theme";
import { ProfileShortcut } from "./profile-shortcut";

/**
 * Top-right header cluster for tab-root screens: an optional notification
 * bell (with unread badge) and the profile avatar. Roles opt into the bell
 * via `showBell` once their notification surfaces are confirmed; otherwise
 * only the profile avatar is shown.
 */
export function HeaderActions({
  showBell = false,
  showProfileShortcut = true,
  showShopShortcut = false,
  accessibilityLabel,
}: {
  showBell?: boolean;
  showProfileShortcut?: boolean;
  showShopShortcut?: boolean;
  accessibilityLabel?: string;
}) {
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
      {showShopShortcut ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open shop"
          hitSlop={8}
          onPress={() => router.push("/shop" as never)}
          style={({ pressed }) => [
            styles.bell,
            { backgroundColor: palette.surface.default, borderColor: palette.border.subtle },
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="bag-outline" size={20} color={palette.text.primary} />
        </Pressable>
      ) : null}
      {showProfileShortcut ? <ProfileShortcut accessibilityLabel={accessibilityLabel} /> : null}
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
