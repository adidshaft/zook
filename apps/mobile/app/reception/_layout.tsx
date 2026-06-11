import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoleTabBarBackground } from "@/components/role-tab-bar-background";
import { useHasPermission } from "@/lib/auth";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { createRoleTabBarStyle, useTheme } from "@/lib/theme";

const legacyViewTargets: Record<string, "/reception/members" | "/reception/payments" | "/reception/orders"> = {
  members: "/reception/members",
  payments: "/reception/payments",
  orders: "/reception/orders",
};

export default function ReceptionLayout() {
  const { palette, mode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const canRecordPayments = useHasPermission("PAYMENTS_RECORD_OFFLINE");
  const canFulfillOrders = useHasPermission("SHOP_FULFILL_ORDER");
  const pendingQuery = useOrgAttendancePending();
  const pendingCount =
    pendingQuery.data?.records.filter((record) => record.status === "PENDING_APPROVAL").length ??
    0;
  const tabBarStyle = createRoleTabBarStyle({ palette, mode, bottomInset: insets.bottom });

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (!rawView || pathname !== "/reception") return;
    const target = legacyViewTargets[rawView];
    if (target) router.replace(target);
  }, [params.view, pathname, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent.base,
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarBackground: () => <RoleTabBarBackground mode={mode} />,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
        },
        tabBarItemStyle: {
          borderRadius: 18,
        },
        tabBarBadgeStyle: {
          backgroundColor: palette.feedback.danger,
          color: palette.text.onDanger,
          fontFamily: "Inter_800ExtraBold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Desk",
          tabBarButtonTestID: "bottom-nav-desk",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "desktop" : "desktop-outline"} size={22} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarButtonTestID: "bottom-nav-members",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Payments",
          href: canRecordPayments ? "/reception/payments" : null,
          tabBarButtonTestID: "bottom-nav-payments",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={22} color={color} />
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="members/[id]" options={{ href: null }} />
      <Tabs.Screen name="payments/new" options={{ href: null }} />
      <Tabs.Screen name="verification/[recordId]" options={{ href: null }} />
    </Tabs>
  );
}
