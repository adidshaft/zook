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
  back: { ios: "chevron.backward", ionicon: "chevron-back" },
};

export function Icon({
  color,
  focused = false,
  name,
  size = 24,
}: {
  color: string;
  focused?: boolean;
  name: AppIconName;
  size?: number;
}) {
  const icon = iconMap[name];
  if (Platform.OS === "ios" && !__DEV__) {
    return <ExpoSymbols.SymbolView name={icon.ios} size={size} tintColor={color} />;
  }
  return (
    <Ionicons
      name={focused && icon.ioniconFocused ? icon.ioniconFocused : icon.ionicon}
      size={size}
      color={color}
    />
  );
}
