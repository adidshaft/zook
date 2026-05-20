import type { ComponentProps } from "react";

import type { MetricTile } from "@/components/primitives";

export type MetricTileItem = {
  label: string;
  value: string | number;
  delta?: { value: string; tone: "up" | "down" | "neutral" };
  hint?: string;
  icon?: ComponentProps<typeof MetricTile>["icon"];
  tone?: ComponentProps<typeof MetricTile>["tone"];
  onPress?: () => void;
  accessibilityLabel?: string;
};

export type MetricGridProps = {
  items: MetricTileItem[];
  columns?: 2 | 3 | 4;
  testID?: string;
};
