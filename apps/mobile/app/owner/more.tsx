import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";

import {
  BranchSelectorChip,
  Card,
  ListRow,
  AppHeader,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { WebHandoffRow } from "@/components/web-handoff-row";
import { useAuth, useHasPermission } from "@/lib/auth";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing } from "@/lib/theme";

type MoreRow = {
  testID?: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: "/owner/stock" | "/owner/billing";
  webPath?: string;
  visible?: boolean;
};

const webRows: MoreRow[] = [
  { title: "Branches", subtitle: "Locations and operating details", icon: "git-branch-outline", webPath: "/dashboard/branches" },
  { title: "Coupons & offers", subtitle: "Discounts and public plan campaigns", icon: "pricetag-outline", webPath: "/dashboard/plans/coupons" },
  { title: "Reports", subtitle: "Revenue, attendance, and member movement", icon: "document-text-outline", webPath: "/dashboard/reports" },
  { title: "Staff", subtitle: "Invite admins, reception, and trainers", icon: "people-circle-outline", webPath: "/dashboard/staff" },
  { title: "Attendance QR Console", subtitle: "Display and rotate entry QR codes", icon: "qr-code-outline", webPath: "/dashboard/attendance/qr-display" },
  { title: "Notification templates", subtitle: "Reusable message drafts", icon: "mail-outline", webPath: "/dashboard/notifications/templates" },
];

export default function OwnerMoreScreen() {
  const router = useRouter();
  const bottomPadding = useBottomScrollPadding();
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const { logout } = useAuth();
  const nativeRows: MoreRow[] = [
    {
      title: "Stock",
      subtitle: "Products and pickups",
      icon: "cube-outline",
      testID: "owner-more-stock",
      href: "/owner/stock",
      visible: canViewStock,
    },
    {
      title: "Billing",
      subtitle: "Trial and subscription",
      icon: "card-outline",
      testID: "owner-more-billing",
      href: "/owner/billing",
      visible: canManageBilling,
    },
  ];

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void logout().then(() => router.replace("/login"));
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-more-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          <AppHeader
            title="More"
            subtitle="Owner tools and web dashboard"
            showProfileShortcut={false}
          />

          <SectionHeader
            title="Account & access"
            subtitle="Switch workspace or safely sign out from this device."
          />
          <Card variant="compact" contentStyle={styles.accountCard}>
            <RoleSwitcherChip />
            <BranchSelectorChip />
            <ZookButton
              testID="owner-more-sign-out"
              variant="destructive"
              icon="log-out-outline"
              onPress={confirmSignOut}
            >
              Sign out
            </ZookButton>
          </Card>

          <SectionHeader title="Owner tools" />
          <Card variant="compact" contentStyle={styles.list}>
            {nativeRows.filter((row) => row.visible !== false).map((row) => (
              <Link key={row.title} href={row.href as never} asChild>
                <Pressable
                  testID={row.testID}
                  accessibilityRole="button"
                  accessibilityLabel={row.title}
                >
                  <ListRow title={row.title} subtitle={row.subtitle} icon={row.icon} />
                </Pressable>
              </Link>
            ))}
          </Card>

          <SectionHeader
            title="Web control room"
            subtitle="Best for configuration, reporting, staff, QR console, audits, and provider diagnostics."
          />
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
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  list: {
    gap: spacing.xs,
  },
  accountCard: {
    gap: spacing.sm,
  },
});
