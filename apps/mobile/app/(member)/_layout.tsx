import { Tabs } from "expo-router";

import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useMyNotifications } from "@/lib/domains/notifications";
import { useGeofenceCheckout } from "@/lib/use-geofence-checkout";

export default function MemberLayout() {
  const geofenceCheckout = useGeofenceCheckout();
  const notificationsQuery = useMyNotifications({
    select: (data) =>
      data.notifications.filter((notification) => !notification.readAt).length,
  });
  const unread = notificationsQuery.data ?? 0;

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <RoleTabBar
            {...props}
            badges={{ you: unread }}
            centerAction={{ routeName: "scan" }}
          />
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
            href: null,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: "You",
            tabBarIcon: ({ color, focused, size }) => (
              <Icon name="you" focused={focused} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {geofenceCheckout.permissionSheet}
    </>
  );
}
