import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconBubble } from "@/components/primitives";
import { useT, type TranslationKey } from "@/lib/i18n";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

type QuickAction = {
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: TranslationKey;
  meta?: string;
  testID?: string;
};

export function QuickActionGrid({ unreadCount }: { unreadCount: number }) {
  const t = useT();
  const actions: QuickAction[] = [
    {
      href: "/notifications",
      icon: "notifications-outline",
      labelKey: "member.you.notifications",
      meta: unreadCount ? t("member.you.unreadCount", { count: unreadCount }) : undefined,
    },
    { href: "/gyms", icon: "business-outline", labelKey: "member.you.switchGym" },
    { href: "/shop", icon: "storefront-outline", labelKey: "nav.shop" },
    { href: "/assistant", icon: "sparkles-outline", labelKey: "member.you.assistant", testID: "more-assistant" },
    { href: "/profile", icon: "gift-outline", labelKey: "member.you.referrals" },
    { href: "/tracking-history", icon: "pulse-outline", labelKey: "member.you.trackingHistory" },
  ];
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <QuickActionTile key={action.labelKey} action={action} />
      ))}
    </View>
  );
}

function QuickActionTile({ action }: { action: QuickAction }) {
  const { palette } = useTheme();
  const t = useT();
  const label = t(action.labelKey);
  return (
    <Pressable
      onPress={() => router.push(action.href as never)}
      testID={action.testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: palette.surface.default, borderColor: palette.border.default },
        pressed ? styles.tilePressed : null,
      ]}
    >
      <IconBubble icon={action.icon} tone="neutral" size={36} />
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.label, { color: palette.text.primary }]}>
          {label}
        </Text>
        {action.meta ? (
          <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
            {action.meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 58,
    minWidth: "47%",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tilePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  label: { ...typography.caption, fontFamily: "Inter_700Bold", minWidth: 0 },
  meta: typography.caption,
});
