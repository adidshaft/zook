import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Card, ListRow, MobileHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { WebHandoffRow } from "@/components/web-handoff-row";
import { useHasPermission } from "@/lib/auth";
import { layout, spacing } from "@/lib/theme";

type MoreRow = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: "/owner/stock" | "/owner/billing";
  webPath?: string;
  visible?: boolean;
};

const webRows: MoreRow[] = [
  { title: "Branches", subtitle: "Manage on web", icon: "git-branch-outline", webPath: "/dashboard/branches" },
  { title: "Coupons & offers", subtitle: "Manage on web", icon: "pricetag-outline", webPath: "/dashboard/plans/coupons" },
  { title: "Reports", subtitle: "Manage on web", icon: "document-text-outline", webPath: "/dashboard/reports" },
  { title: "Staff", subtitle: "Manage on web", icon: "people-circle-outline", webPath: "/dashboard/staff" },
  { title: "Notification templates", subtitle: "Manage on web", icon: "mail-outline", webPath: "/dashboard/notifications/templates" },
];

export default function OwnerMoreScreen() {
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const nativeRows: MoreRow[] = [
    {
      title: "Stock",
      subtitle: "Products and pickups",
      icon: "cube-outline",
      href: "/owner/stock",
      visible: canViewStock,
    },
    {
      title: "Billing",
      subtitle: "Trial and subscription",
      icon: "card-outline",
      href: "/owner/billing",
      visible: canManageBilling,
    },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-more-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader title="More" subtitle="Owner tools and web dashboard" showProfileShortcut={false} />

          <SectionHeader title="Owner tools" />
          <Card variant="compact" contentStyle={styles.list}>
            {nativeRows.filter((row) => row.visible !== false).map((row) => (
              <Link key={row.title} href={row.href as never} asChild>
                <Pressable accessibilityRole="button" accessibilityLabel={row.title}>
                  <ListRow title={row.title} subtitle={row.subtitle} icon={row.icon} />
                </Pressable>
              </Link>
            ))}
          </Card>

          <SectionHeader title="Manage on web" />
          <Card variant="compact" contentStyle={styles.list}>
            {webRows.map((row) => (
              <WebHandoffRow key={row.title} title={row.title} path={row.webPath ?? "/dashboard"} />
            ))}
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 14,
    width: "100%",
  },
  list: {
    gap: spacing.xs,
  },
});
