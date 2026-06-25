import { Pressable, StyleSheet, Text } from "react-native";

import { ListRow } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { typography, useTheme } from "@/lib/theme";

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
  return (
    <ListRow
      title={product.name}
      subtitle={t("owner.stock.leftThreshold", {
        stock: product.stock ?? 0,
        threshold: product.lowStockThreshold ?? 0,
      })}
      trailing={
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
          <Text style={[styles.reorderText, { color: palette.feedback.warning }]}>{t("owner.stock.reorder")}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  reorderButton: {
    alignItems: "center",
    minHeight: 44,
    minWidth: 88,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  reorderButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  reorderText: {
    ...typography.caption,
  },
});
