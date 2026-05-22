import { Stack } from "expo-router";

import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { useTheme } from "@/lib/theme";

export default function OnboardingLayout() {
  useHideBottomNav();
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg.app },
      }}
    />
  );
}
