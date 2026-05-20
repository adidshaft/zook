import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

const legacyViewTargets: Record<string, "/trainer/clients" | "/trainer/plans"> = {
  clients: "/trainer/clients",
  plans: "/trainer/plans",
};

export default function TrainerLayout() {
  const { palette } = useTheme();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();

  useEffect(() => {
    const view = Array.isArray(params.view) ? params.view[0] : params.view;
    const target = view ? legacyViewTargets[view] : undefined;
    if (target) router.replace(target as never);
  }, [params.view, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent.base,
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarStyle: {
          backgroundColor: palette.bg.elevated,
          borderTopColor: palette.border.subtle,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "reader" : "reader-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="clients/[id]" options={{ href: null }} />
      <Tabs.Screen name="client/[id]" options={{ href: null }} />
      <Tabs.Screen name="client/[id]/ai-draft" options={{ href: null }} />
    </Tabs>
  );
}
