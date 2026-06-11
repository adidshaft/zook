import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "./foundation";
import { spacing, typography, useTheme } from "@/lib/theme";

type IonIconName = keyof typeof Ionicons.glyphMap;

export function StatStrip({
  items,
}: {
  items: Array<{ label: string; value: string; icon?: IonIconName }>;
}) {
  const { palette } = useTheme();
  const visibleItems = items.slice(0, 4);

  return (
    <Card variant="compact" contentStyle={styles.content}>
      {visibleItems.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.item}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} /> : null}
          <View style={styles.itemContent}>
            {item.icon ? <Ionicons name={item.icon} size={16} color={palette.accent.base} /> : null}
            <Text numberOfLines={1} style={[styles.value, { color: palette.text.primary }]}>
              {item.value}
            </Text>
            <Text numberOfLines={1} style={[styles.label, { color: palette.text.secondary }]}>
              {item.label}
            </Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingVertical: spacing.md,
  },
  item: {
    flex: 1,
    minWidth: 0,
  },
  itemContent: {
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  divider: {
    bottom: 4,
    left: 0,
    position: "absolute",
    top: 4,
    width: StyleSheet.hairlineWidth,
  },
  value: {
    ...typography.bodyStrong,
    textAlign: "center",
  },
  label: {
    ...typography.caption,
    textAlign: "center",
  },
});
