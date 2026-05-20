import { Pressable, StyleSheet, Text } from "react-native";

import { IconBubble, ListRow } from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import { colors, typography } from "@/lib/theme";

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
  return (
    <ListRow
      title={product.name}
      subtitle={`${formatInr(product.pricePaise ?? 0)} · threshold ${product.lowStockThreshold ?? 0}`}
      leading={<IconBubble icon="cube-outline" tone="amber" />}
      trailing={
        <Pressable
          onPress={onReorder}
          accessibilityRole="button"
          accessibilityLabel={`Reorder ${product.name}`}
          style={styles.reorderButton}
        >
          <Text style={styles.reorderText}>Reorder</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  reorderButton: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.28)",
    backgroundColor: "rgba(242,201,76,0.08)",
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  reorderText: {
    color: colors.warning,
    ...typography.caption,
  },
});
