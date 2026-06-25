import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useT } from "@/lib/i18n";

const viewRedirectTargets: Record<string, "/trainer" | "/trainer/clients" | "/trainer/plans" | "/trainer/payouts"> = {
  home: "/trainer",
  clients: "/trainer/clients",
  plans: "/trainer/plans",
  payouts: "/trainer/payouts",
};

export default function TrainerLayout() {
  const t = useT();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const view = Array.isArray(params.view) ? params.view[0] : params.view;
    const target = view ? viewRedirectTargets[view] : undefined;
    if (target && pathname !== target) router.replace(target as never);
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
          title: t("nav.command"),
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="home" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/index"
        options={{
          title: t("nav.clients"),
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="members" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: t("nav.plans"),
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="plan" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{
          title: t("nav.payouts"),
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="payouts" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients/[id]"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="pt"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="classes"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="class-roster"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="payout-settings"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
