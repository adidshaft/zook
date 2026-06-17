import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";

const viewRedirectTargets: Record<string, "/trainer/clients" | "/trainer/plans" | "/trainer/payouts"> = {
  clients: "/trainer/clients",
  plans: "/trainer/plans",
  payouts: "/trainer/payouts",
};

export default function TrainerLayout() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const view = Array.isArray(params.view) ? params.view[0] : params.view;
    const target = view ? viewRedirectTargets[view] : undefined;
    if (target && pathname === "/trainer") router.replace(target as never);
  }, [params.view, pathname, router]);

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
      <Tabs.Screen
        name="clients/[id]"
        options={{ href: null, tabBarItemStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
