import { Tabs, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";

import { Icon } from "@/components/primitives";
import { RoleTabBar } from "@/components/role-tab-bar";
import { useHasPermission } from "@/lib/auth";
import { useOrgJoinRequests } from "@/lib/domains/owner";

const viewRedirectTargets: Record<
  string,
  "/owner" | "/owner/members" | "/owner/approvals" | "/owner/revenue" | "/owner/stock" | "/owner/billing"
> = {
  home: "/owner",
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
    if (!rawView) return;
    const target = viewRedirectTargets[rawView];
    if (target && pathname !== target) router.replace(target as never);
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
            <Icon name="home" focused={focused} size={size} color={color} />
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
        name="approvals"
        options={{
          title: "Approvals",
          tabBarButtonTestID: "bottom-nav-approvals",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="approvals" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="revenue"
        options={{
          title: "Revenue",
          href: canViewRevenue ? "/owner/revenue" : null,
          tabBarItemStyle: canViewRevenue ? undefined : { display: "none" },
          tabBarButtonTestID: "bottom-nav-revenue",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="revenue" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarButtonTestID: "bottom-nav-more",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="more" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: "Stock",
          href: null,
          tabBarItemStyle: { display: "none" },
          tabBarButtonTestID: "bottom-nav-stock",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="stock" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: "Billing",
          href: null,
          tabBarItemStyle: { display: "none" },
          tabBarButtonTestID: "bottom-nav-billing",
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="billing" focused={focused} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="member/[id]"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="payouts"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="referrals"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="plans"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="coupons"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="staff"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
      <Tabs.Screen
        name="entry-qr"
        options={{ href: null, tabBarItemStyle: { display: "none" }, tabBarStyle: { display: "none" } }}
      />
    </Tabs>
  );
}
