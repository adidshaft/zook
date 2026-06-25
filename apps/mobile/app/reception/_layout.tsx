import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useHasPermission } from "@/lib/auth";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useT } from "@/lib/i18n";

const viewRedirectTargets: Record<string, "/reception" | "/reception/members" | "/reception/payments" | "/reception/orders"> = {
  home: "/reception",
  members: "/reception/members",
  payments: "/reception/payments",
  orders: "/reception/orders",
};

export default function ReceptionLayout() {
  const t = useT();
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
    if (!rawView) return;
    const target = viewRedirectTargets[rawView];
    if (target && pathname !== target) router.replace(target as never);
  }, [params.view, pathname, router]);

  return (
    <Tabs
      tabBar={(props) => (
        <RoleTabBar {...props} badges={{ index: pendingCount }} centerAction={{ routeName: "entry-qr" }} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.desk"),
          tabBarButtonTestID: "bottom-nav-desk",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="desk" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: t("nav.members"),
          tabBarButtonTestID: "bottom-nav-members",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="members" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="entry-qr"
        options={{
          title: t("nav.scan"),
          tabBarButtonTestID: "bottom-nav-scan",
          tabBarIcon: ({ color, size }) => <Icon name="scan" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t("nav.payments"),
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
          title: t("nav.orders"),
          href: canFulfillOrders ? "/reception/orders" : null,
          tabBarItemStyle: canFulfillOrders ? undefined : { display: "none" },
          tabBarButtonTestID: "bottom-nav-orders",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="orders" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members/[id]"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="verification/[recordId]"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="class-roster"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
