import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconBubble } from "@/components/primitives";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

type QuickAction = {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta?: string;
};

export function QuickActionGrid({ gymHref = "/find-gyms", unreadCount }: { gymHref?: string; unreadCount: number }) {
  const actions: QuickAction[] = [
    { href: "/notifications", icon: "notifications-outline", label: "Notifications", meta: unreadCount ? `${unreadCount} unread` : undefined },
    { href: "/shop", icon: "storefront-outline", label: "Shop" },
    { href: "/assistant", icon: "sparkles-outline", label: "Assistant" },
    { href: gymHref, icon: "business-outline", label: "Gym profile" },
    { href: "/profile", icon: "gift-outline", label: "Referral" },
    { href: "/plan", icon: "pulse-outline", label: "Tracking history" },
  ];
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <QuickActionTile key={action.label} action={action} />
      ))}
    </View>
  );
}

function QuickActionTile({ action }: { action: QuickAction }) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(action.href as never)}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={[styles.tile, { backgroundColor: palette.surface.default, borderColor: palette.border.default }]}
    >
      <IconBubble icon={action.icon} tone="neutral" size={36} />
      <Text style={[styles.label, { color: palette.text.primary }]}>{action.label}</Text>
      {action.meta ? <Text style={[styles.meta, { color: palette.text.secondary }]}>{action.meta}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: 7,
    minHeight: 112,
    minWidth: "47%",
    padding: 14,
  },
  label: typography.cardTitle,
  meta: typography.caption,
});
