import { Stack } from "expo-router";
import { typography, useTheme } from "@/lib/theme";

export default function ShopLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: "minimal",
        headerStyle: { backgroundColor: palette.bg.app },
        headerTintColor: palette.accent.base,
        headerTitleStyle: typography.headerTitle,
        contentStyle: { backgroundColor: palette.bg.app },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "none", title: "Shop" }} />
      <Stack.Screen name="cart" options={{ animation: "slide_from_right", title: "Cart" }} />
      <Stack.Screen name="checkout" options={{ animation: "slide_from_right", title: "Checkout" }} />
      <Stack.Screen name="pickup/[orderId]" options={{ animation: "slide_from_right", title: "Pickup" }} />
    </Stack>
  );
}
