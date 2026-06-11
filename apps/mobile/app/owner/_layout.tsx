import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RoleTabBarBackground } from "@/components/role-tab-bar-background";
import { useHasPermission } from "@/lib/auth";
import { useOrgJoinRequests } from "@/lib/domains/owner";
import { createRoleTabBarStyle, useTheme } from "@/lib/theme";

const legacyViewTargets: Record<
  string,
  "/owner/members" | "/owner/approvals" | "/owner/revenue" | "/owner/stock" | "/owner/billing"
> = {
  members: "/owner/members",
  approvals: "/owner/approvals",
  revenue: "/owner/revenue",
  stock: "/owner/stock",
  billing: "/owner/billing",
};

export default function OwnerLayout() {
  const { palette, mode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const canViewRevenue = useHasPermission("ORG_VIEW_REPORTS");
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const approvalsQuery = useOrgJoinRequests();
  const pendingCount =
    approvalsQuery.data?.joinRequests.filter(
      (request) => String(request.status ?? "").toLowerCase() === "pending",
    ).length ?? 0;
  const tabBarStyle = createRoleTabBarStyle({
    palette,
    mode,
    inset: 12,
    bottomInset: insets.bottom,
    height: 72,
  });

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (!rawView || pathname !== "/owner") return;
    const target = legacyViewTargets[rawView];
    if (target) router.replace(target as never);
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
          fontSize: 9,
          fontFamily: "Inter_600SemiBold",
        },
        tabBarItemStyle: {
          borderRadius: 14,
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
          title: "Today",
          tabBarButtonTestID: "bottom-nav-command",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pulse" : "pulse-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarButtonTestID: "bottom-nav-members",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarButtonTestID: "bottom-nav-approvals",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkmark-done" : "checkmark-done-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: "Revenue",
          href: canViewRevenue ? "/owner/revenue" : null,
          tabBarButtonTestID: "bottom-nav-revenue",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          href: canViewStock ? "/owner/stock" : null,
          tabBarButtonTestID: "bottom-nav-stock",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Billing",
          href: canManageBilling ? ("/owner/billing" as never) : null,
          tabBarButtonTestID: "bottom-nav-billing",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
    </Tabs>
  );
}
