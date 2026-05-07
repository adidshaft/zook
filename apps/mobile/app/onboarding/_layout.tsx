import { Stack } from "expo-router";

import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";

export default function OnboardingLayout() {
  useHideBottomNav();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#070908" },
      }}
    />
  );
}
