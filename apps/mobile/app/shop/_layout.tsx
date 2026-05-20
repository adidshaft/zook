import { Stack } from "expo-router";
import { legacyColors } from "@/lib/theme";

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: legacyColors.bg } }}>
      <Stack.Screen name="index" options={{ animation: "none" }} />
      <Stack.Screen name="cart" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="checkout" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pickup/[orderId]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
