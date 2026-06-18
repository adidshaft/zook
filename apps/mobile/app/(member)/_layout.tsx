import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useGeofenceCheckout } from "@/lib/use-geofence-checkout";

export default function MemberLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const geofenceCheckout = useGeofenceCheckout();

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    const target = rawView
      ? {
          home: "/",
          plan: "/plan",
          scan: "/scan",
          progress: "/progress",
          shop: "/shop",
        }[rawView]
      : undefined;
    if (target && pathname !== target) {
      router.replace(target as never);
    }
  }, [params.view, pathname, router]);

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <RoleTabBar {...props} centerAction={{ routeName: "scan" }} />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name="home" focused={focused} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: "Plan",
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name="plan" focused={focused} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ color, size }) => (
              <Icon name="scan" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name="progress" focused={focused} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: "Shop",
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name="shop" focused={focused} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="diet"
          options={{ title: "Diet", href: null, tabBarItemStyle: { display: "none" } }}
        />
      </Tabs>
      {geofenceCheckout.permissionSheet}
    </>
  );
}
