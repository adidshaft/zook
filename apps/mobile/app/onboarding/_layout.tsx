import { Stack } from "expo-router";

import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { colors } from "@/lib/theme";

export default function OnboardingLayout() {
  useHideBottomNav();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
