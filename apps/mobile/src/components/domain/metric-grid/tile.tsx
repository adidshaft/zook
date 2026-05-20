import { Pressable, StyleSheet } from "react-native";

import { MetricTile as PrimitiveMetricTile } from "@/components/primitives";
import type { MetricTileItem } from "./types";

export function DomainMetricTile({
  item,
  slotStyle,
}: {
  item: MetricTileItem;
  slotStyle: object;
}) {
  const tile = (
    <PrimitiveMetricTile
      label={item.label}
      value={String(item.value)}
      detail={item.hint ?? item.delta?.value}
      icon={item.icon}
      tone={item.tone}
      style={slotStyle}
    />
  );
  if (!item.onPress) return tile;
  return (
    <Pressable
      onPress={item.onPress}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel ?? item.label}
      style={[styles.pressable, slotStyle]}
    >
      {tile}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minWidth: 0 },
});
