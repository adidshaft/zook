import { Ionicons } from "@expo/vector-icons";
import * as ExpoSymbols from "expo-symbols";
import type { SFSymbol } from "expo-symbols";
import { Platform } from "react-native";

export type AppIconName =
  | "home"
  | "plan"
  | "scan"
  | "progress"
  | "you"
  | "members"
  | "approvals"
  | "revenue"
  | "more"
  | "desk"
  | "payments"
  | "orders"
  | "stock"
  | "billing"
  | "payouts"
  | "shop"
  | "back";

const iconMap: Record<
  AppIconName,
  {
    ios: SFSymbol;
    ionicon: keyof typeof Ionicons.glyphMap;
    ioniconFocused?: keyof typeof Ionicons.glyphMap;
  }
> = {
  home: { ios: "house", ionicon: "home-outline", ioniconFocused: "home" },
  plan: { ios: "dumbbell", ionicon: "barbell-outline", ioniconFocused: "barbell" },
  scan: { ios: "qrcode.viewfinder", ionicon: "qr-code" },
  progress: {
    ios: "chart.line.uptrend.xyaxis",
    ionicon: "stats-chart-outline",
    ioniconFocused: "stats-chart",
  },
  you: { ios: "person", ionicon: "person-outline", ioniconFocused: "person" },
  members: { ios: "person.2", ionicon: "people-outline", ioniconFocused: "people" },
  approvals: {
    ios: "checkmark.seal",
    ionicon: "checkmark-done-outline",
    ioniconFocused: "checkmark-done",
  },
  revenue: {
    ios: "chart.line.uptrend.xyaxis",
    ionicon: "trending-up-outline",
    ioniconFocused: "trending-up",
  },
  more: {
    ios: "ellipsis",
    ionicon: "ellipsis-horizontal-outline",
    ioniconFocused: "ellipsis-horizontal",
  },
  desk: { ios: "desktopcomputer", ionicon: "desktop-outline", ioniconFocused: "desktop" },
  payments: { ios: "creditcard", ionicon: "card-outline", ioniconFocused: "card" },
  orders: { ios: "shippingbox", ionicon: "cube-outline", ioniconFocused: "cube" },
  stock: { ios: "cube.box", ionicon: "cube-outline", ioniconFocused: "cube" },
  billing: { ios: "creditcard", ionicon: "card-outline", ioniconFocused: "card" },
  payouts: { ios: "wallet.pass", ionicon: "wallet-outline", ioniconFocused: "wallet" },
  shop: { ios: "bag", ionicon: "bag-outline", ioniconFocused: "bag" },
  back: { ios: "chevron.backward", ionicon: "chevron-back" },
};

export function Icon({
  accessibilityLabel,
  color,
  decorative = true,
  focused = false,
  name,
  size = 24,
}: {
  accessibilityLabel?: string;
  color: string;
  decorative?: boolean;
  focused?: boolean;
  name: AppIconName;
  size?: number;
}) {
  const icon = iconMap[name];
  const accessibilityProps = decorative
    ? ({ accessibilityElementsHidden: true, importantForAccessibility: "no" as const } as const)
    : ({ accessibilityRole: "image" as const, accessibilityLabel: accessibilityLabel ?? name } as const);
  if (Platform.OS === "ios") {
    return <ExpoSymbols.SymbolView {...accessibilityProps} name={icon.ios} size={size} tintColor={color} />;
  }
  return (
    <Ionicons
      {...accessibilityProps}
      name={focused && icon.ioniconFocused ? icon.ioniconFocused : icon.ionicon}
      size={size}
      color={color}
    />
  );
}
