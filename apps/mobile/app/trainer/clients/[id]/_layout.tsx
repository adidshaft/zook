import { Stack } from "expo-router";
import { useTheme } from "@/lib/theme";

export default function ClientDetailLayout() {
  const { palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        // Each client-detail screen renders its own in-content header (with the
        // Overview/Plan/Sessions segmented control + back), so suppress the
        // native nav-bar header to avoid a duplicate title.
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg.app },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="diet" />
      <Stack.Screen name="sessions" />
    </Stack>
  );
}
