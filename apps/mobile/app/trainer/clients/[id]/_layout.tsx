import { Stack } from "expo-router";
import { typography, useTheme } from "@/lib/theme";

export default function ClientDetailLayout() {
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
      <Stack.Screen name="index" options={{ title: "Client" }} />
      <Stack.Screen name="plan" options={{ title: "Plan draft" }} />
      <Stack.Screen name="sessions" options={{ title: "Sessions" }} />
    </Stack>
  );
}
