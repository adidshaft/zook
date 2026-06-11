import { Ionicons } from "@expo/vector-icons";
import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { RoleTabBar } from "@/components/role-tab-bar";
import { useHasPermission } from "@/lib/auth";
import { useOrgJoinRequests } from "@/lib/domains/owner";

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
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const canViewRevenue = useHasPermission("ORG_VIEW_REPORTS");
  const approvalsQuery = useOrgJoinRequests(undefined, {
    select: (data) =>
      data.joinRequests.filter(
      (request) => String(request.status ?? "").toLowerCase() === "pending",
    ).length,
  });
  const pendingCount = approvalsQuery.data ?? 0;

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (!rawView || pathname !== "/owner") return;
    const target = legacyViewTargets[rawView];
    if (target) router.replace(target as never);
  }, [params.view, pathname, router]);

  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} badges={{ approvals: pendingCount }} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarButtonTestID: "bottom-nav-command",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "pulse" : "pulse-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: "Members",
          tabBarButtonTestID: "bottom-nav-members",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarButtonTestID: "bottom-nav-approvals",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "checkmark-done" : "checkmark-done-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: "Revenue",
          href: canViewRevenue ? "/owner/revenue" : null,
          tabBarButtonTestID: "bottom-nav-revenue",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarButtonTestID: "bottom-nav-more",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "ellipsis-horizontal" : "ellipsis-horizontal-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          href: null,
          tabBarButtonTestID: "bottom-nav-stock",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "cube" : "cube-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Billing",
          href: null,
          tabBarButtonTestID: "bottom-nav-billing",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? "card" : "card-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="member/[id]" options={{ href: null }} />
    </Tabs>
  );
}
