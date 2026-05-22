import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { useHasPermission } from "@/lib/auth";
import { useOrgJoinRequests } from "@/lib/domains/owner";
import { legacyColors, useTheme } from "@/lib/theme";

const legacyViewTargets: Record<string, "/owner/members" | "/owner/approvals" | "/owner/revenue" | "/owner/stock"> = {
  members: "/owner/members",
  approvals: "/owner/approvals",
  revenue: "/owner/revenue",
  stock: "/owner/stock",
};

export default function OwnerLayout() {
  const { palette } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const canViewRevenue = useHasPermission("ORG_VIEW_REPORTS");
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const approvalsQuery = useOrgJoinRequests();
  const pendingCount =
    approvalsQuery.data?.joinRequests.filter(
      (request) => String(request.status ?? "").toLowerCase() === "pending",
    ).length ?? 0;

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (!rawView || pathname !== "/owner") return;
    const target = legacyViewTargets[rawView];
    if (target) router.replace(target);
  }, [params.view, pathname, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent.base,
        tabBarInactiveTintColor: palette.text.tertiary,
        tabBarStyle: {
          backgroundColor: palette.bg.elevated,
          borderTopColor: palette.border.subtle,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Command",
          tabBarButtonTestID: "bottom-nav-command",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pulse" : "pulse-outline"} size={22} color={color} />
          ),
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
        name="approvals"
        options={{
          title: "Approvals",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarButtonTestID: "bottom-nav-approvals",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkmark-done" : "checkmark-done-outline"} size={22} color={color} />
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
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={22} color={color} />
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
            <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
    </Tabs>
  );
}
