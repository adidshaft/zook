import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

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
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: "Plan",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? "barbell" : "barbell-outline"} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="qr-code" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: "Progress",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={size} color={color} />
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
          name="diet"
          options={{
            title: "Diet",
            href: null,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: "You",
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {geofenceCheckout.permissionSheet}
    </>
  );
}
