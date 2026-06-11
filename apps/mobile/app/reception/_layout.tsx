import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useHasPermission } from "@/lib/auth";
import { useOrgAttendancePending } from "@/lib/domains/attendance";

const viewRedirectTargets: Record<string, "/reception/members" | "/reception/payments" | "/reception/orders"> = {
  members: "/reception/members",
  payments: "/reception/payments",
  orders: "/reception/orders",
};

export default function ReceptionLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const canRecordPayments = useHasPermission("PAYMENTS_RECORD_OFFLINE");
  const canFulfillOrders = useHasPermission("SHOP_FULFILL_ORDER");
  const pendingQuery = useOrgAttendancePending();
  const pendingCount =
    pendingQuery.data?.records.filter((record) => record.status === "PENDING_APPROVAL").length ??
    0;

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (!rawView || pathname !== "/reception") return;
    const target = viewRedirectTargets[rawView];
    if (target) router.replace(target);
  }, [params.view, pathname, router]);

  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} badges={{ index: pendingCount }} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Front desk",
          tabBarButtonTestID: "bottom-nav-desk",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="desk" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarButtonTestID: "bottom-nav-members",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="members" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          href: canRecordPayments ? "/reception/payments" : null,
          tabBarButtonTestID: "bottom-nav-payments",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="payments" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        listeners={{
          tabPress: (event) => {
            if (!canFulfillOrders) return;
            event.preventDefault();
            router.replace("/reception/orders");
          },
        }}
        options={{
          title: "Orders",
          href: canFulfillOrders ? "/reception/orders" : null,
          tabBarButtonTestID: "bottom-nav-orders",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="orders" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="members/[id]" options={{ href: null }} />
      <Tabs.Screen name="payments/new" options={{ href: null }} />
      <Tabs.Screen name="verification/[recordId]" options={{ href: null }} />
    </Tabs>
  );
}
