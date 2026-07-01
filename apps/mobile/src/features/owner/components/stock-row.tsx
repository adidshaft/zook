import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Pill } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { formatInr } from "@/lib/formatting";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

export type LowStockProduct = {
  id: string;
  name: string;
  pricePaise?: number | null;
  stock?: number | null;
  lowStockThreshold?: number | null;
};

export function StockRow({
  product,
  onReorder,
}: {
  product: LowStockProduct;
  onReorder: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  const stock = product.stock ?? 0;
  const threshold = product.lowStockThreshold ?? 0;
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: palette.border.subtle,
          backgroundColor: palette.surface.default,
        },
      ]}
    >
      <View style={styles.stockBadge}>
        <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.stockNumber, { color: palette.feedback.warning }]}>
          {stock}
        </Text>
        <Text numberOfLines={1} style={[styles.stockLabel, { color: palette.text.tertiary }]}>
          {t("owner.stock.left")}
        </Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
            {product.name}
          </Text>
          {product.pricePaise != null ? (
            <Text numberOfLines={1} style={[styles.price, { color: palette.text.secondary }]}>
              {formatInr(product.pricePaise)}
            </Text>
          ) : null}
        </View>
        <View style={styles.metaLine}>
          <Pill tone="amber" style={styles.thresholdPill} textStyle={styles.thresholdText}>
            {t("owner.stock.thresholdShort", { threshold })}
          </Pill>
          <Text numberOfLines={1} style={[styles.metaText, { color: palette.text.tertiary }]}>
            {t("owner.stock.reorderNow")}
          </Text>
        </View>
      </View>
      <View style={styles.actionSlot}>
        <Pressable
          onPress={onReorder}
          accessibilityRole="button"
          accessibilityLabel={t("owner.stock.reorderAccessibility", { name: product.name })}
          style={({ pressed }) => [
            styles.reorderButton,
            {
              borderColor: palette.feedback.warning,
              backgroundColor: palette.surface.warningSoft,
            },
            pressed ? styles.reorderButtonPressed : null,
          ]}
        >
          <Ionicons name="refresh-outline" size={16} color={palette.feedback.warning} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  stockBadge: {
    width: 46,
    alignItems: "center",
    gap: 1,
  },
  stockNumber: {
    ...typography.cardTitle,
    lineHeight: 24,
  },
  stockLabel: {
    ...typography.small,
  },
  copy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  titleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
    flex: 1,
    minWidth: 0,
  },
  price: {
    ...typography.caption,
    flexShrink: 0,
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  thresholdPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  thresholdText: {
    ...typography.small,
  },
  metaText: {
    ...typography.small,
    flex: 1,
    minWidth: 0,
  },
  actionSlot: {
    flexShrink: 0,
  },
  reorderButton: {
    alignItems: "center",
    height: 32,
    width: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  reorderButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
