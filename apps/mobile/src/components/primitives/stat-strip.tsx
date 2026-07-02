import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "./foundation";
import { spacing, typography, useTheme } from "@/lib/theme";

type StatStripItem = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

export function StatStrip({
  items,
}: {
  items: StatStripItem[];
}) {
  const { palette } = useTheme();
  const visibleItems = items.slice(0, 4);

  return (
    <Card variant="compact" contentStyle={styles.content}>
      {visibleItems.map((item, index) => (
        <View key={`${item.label}-${index}`} style={styles.item}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} /> : null}
          <View style={styles.itemContent}>
            <View style={styles.valueRow}>
              {item.icon ? (
                <Ionicons name={item.icon} size={14} color={palette.text.secondary} />
              ) : null}
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                numberOfLines={1}
                style={[styles.value, { color: palette.text.primary }]}
              >
                {item.value}
              </Text>
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.82}
              numberOfLines={1}
              style={[styles.label, { color: palette.text.secondary }]}
            >
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
    paddingVertical: spacing.sm,
  },
  item: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  itemContent: {
    alignItems: "center",
    gap: 3,
    minWidth: 0,
    paddingHorizontal: spacing.xs,
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
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
  },
  valueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    maxWidth: "100%",
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
  },
});
