import { Tabs, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";

const legacyViewTargets: Record<string, "/trainer/clients" | "/trainer/plans"> = {
  clients: "/trainer/clients",
  plans: "/trainer/plans",
};

export default function TrainerLayout() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();

  useEffect(() => {
    const view = Array.isArray(params.view) ? params.view[0] : params.view;
    const target = view ? legacyViewTargets[view] : undefined;
    if (target) router.replace(target as never);
  }, [params.view, router]);

  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="home" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="members" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="plan" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: "Payouts",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="payouts" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="clients/[id]" options={{ href: null }} />
    </Tabs>
  );
}
