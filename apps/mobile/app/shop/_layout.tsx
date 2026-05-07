import { Stack } from "expo-router";

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#070908" } }}>
      <Stack.Screen name="cart" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="checkout" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="pickup/[orderId]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
