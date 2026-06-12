import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { IconBubble, ListRow } from "@/components/primitives";
import { typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import type { AttentionItem } from "./types";

function normalizeTone(tone: AttentionItem["tone"]) {
  return tone === "danger" ? "red" : tone;
}

export function AttentionListItem({ item }: { item: AttentionItem }) {
  const { palette } = useTheme();
  const content = (
    <ListRow
      title={item.title}
      subtitle={item.subtitle}
      leading={<IconBubble icon={item.icon} tone={normalizeTone(item.tone)} />}
      trailing={
        item.cta ? (
          <View style={styles.trailing}>
            <Text style={[styles.cta, { color: palette.accent.base }]}>{item.cta.label}</Text>
            <Ionicons name="chevron-forward" size={17} color={palette.text.secondary} />
          </View>
        ) : null
      }
    />
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
  pressable: { borderRadius: 16 },
  pressablePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  trailing: { flexDirection: "row", alignItems: "center", gap: 6 },
  cta: typography.caption,
});
