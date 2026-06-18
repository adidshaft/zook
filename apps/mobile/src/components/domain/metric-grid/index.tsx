import { StyleSheet, View } from "react-native";

import { spacing } from "@/lib/theme";
import { DomainMetricTile } from "./tile";
import type { MetricGridProps } from "./types";

export type { MetricTileItem } from "./types";

// Supports populated metric states in two, three, and four-column layouts.
export function MetricGrid({ columns = 2, items, testID }: MetricGridProps) {
  const basis = `${100 / columns - 3}%`;
  return (
    <View testID={testID} style={styles.grid}>
      {items.map((item) => (
        <DomainMetricTile
          key={`${item.label}-${item.value}`}
          item={item}
          slotStyle={{ flexBasis: basis, flexGrow: 1 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
