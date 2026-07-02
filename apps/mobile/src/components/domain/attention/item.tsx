import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconBubble, normalizePillTone } from "@/components/primitives";
import { spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { AttentionItem } from "./types";

export function AttentionListItem({ item }: { item: AttentionItem }) {
  const { palette } = useTheme();
  const content = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: palette.surface.default,
          borderColor: palette.border.subtle,
        },
      ]}
    >
      <IconBubble icon={item.icon} tone={normalizePillTone(item.tone)} size={26} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: palette.text.secondary }]}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {item.cta ? (
        <View style={styles.trailing}>
          <Text numberOfLines={1} style={[styles.cta, { color: palette.accent.base }]}>
            {item.cta.label}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={palette.text.secondary} />
        </View>
      ) : null}
    </View>
  );
  if (!item.cta) return content;
  return (
    <Pressable
      onPress={item.cta.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.cta.label}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressablePressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 14 },
  pressablePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  row: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.small,
  },
  trailing: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    maxWidth: 104,
  },
  cta: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
});
