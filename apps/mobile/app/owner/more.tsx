import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import {
  Card,
  HeaderActions,
  ListRow,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { WebHandoffRow } from "@/components/web-handoff-row";
import { useHasPermission } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing } from "@/lib/theme";

type MoreRow = {
  testID?: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: "/owner/stock" | "/owner/billing" | "/owner/payouts" | "/owner/referrals" | "/owner/plans" | "/owner/exercise-library" | "/owner/coupons" | "/owner/staff" | "/owner/entry-qr" | "/rewards";
  webPath?: string;
  visible?: boolean;
};

export default function OwnerMoreScreen() {
  const { t } = useI18n();
  const bottomPadding = useBottomScrollPadding();
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const canManagePayouts = useHasPermission("TRAINERS_MANAGE");
  const canManageReferrals = useHasPermission("REFERRALS_MANAGE");
  const canManagePlans = useHasPermission("MEMBERSHIP_PLAN_MANAGE");
  const canManageCoupons = useHasPermission("COUPONS_MANAGE");
  const canManageStaff = useHasPermission("ORG_MANAGE_STAFF");
  const canDisplayQr = useHasPermission("ATTENDANCE_QR_DISPLAY");
  const webRows: MoreRow[] = [
    { title: t("owner.more.branches"), subtitle: t("owner.more.branchesSubtitle"), icon: "git-branch-outline", webPath: "/dashboard/branches" },
    { title: t("owner.more.reports"), subtitle: t("owner.more.reportsSubtitle"), icon: "document-text-outline", webPath: "/dashboard/reports" },
    { title: t("owner.more.notificationTemplates"), subtitle: t("owner.more.notificationTemplatesSubtitle"), icon: "mail-outline", webPath: "/dashboard/notifications/templates" },
  ];
  const nativeRows: MoreRow[] = [
    {
      title: t("owner.more.entryQr"),
      subtitle: t("owner.more.entryQrSubtitle"),
      icon: "qr-code-outline",
      testID: "owner-more-entry-qr",
      href: "/owner/entry-qr",
      visible: canDisplayQr,
    },
    {
      title: t("owner.more.staff"),
      subtitle: t("owner.more.staffSubtitle"),
      icon: "people-circle-outline",
      testID: "owner-more-staff",
      href: "/owner/staff",
      visible: canManageStaff,
    },
    {
      title: t("owner.more.membershipPlans"),
      subtitle: t("owner.more.membershipPlansSubtitle"),
      icon: "pricetags-outline",
      testID: "owner-more-plans",
      href: "/owner/plans",
      visible: canManagePlans,
    },
    {
      title: t("owner.more.exerciseLibrary"),
      subtitle: t("owner.more.exerciseLibrarySubtitle"),
      icon: "barbell-outline",
      testID: "owner-more-exercise-library",
      href: "/owner/exercise-library",
      visible: canManagePlans,
    },
    {
      title: t("owner.more.couponsOffers"),
      subtitle: t("owner.more.couponsOffersSubtitle"),
      icon: "pricetag-outline",
      testID: "owner-more-coupons",
      href: "/owner/coupons",
      visible: canManageCoupons,
    },
    {
      title: t("owner.more.referGym"),
      subtitle: t("owner.more.referGymSubtitle"),
      icon: "gift-outline",
      testID: "owner-more-rewards",
      href: "/rewards",
    },
    {
      title: t("owner.more.referralProgram"),
      subtitle: t("owner.more.referralProgramSubtitle"),
      icon: "ribbon-outline",
      testID: "owner-more-referrals",
      href: "/owner/referrals",
      visible: canManageReferrals,
    },
    {
      title: t("owner.more.trainerPayouts"),
      subtitle: t("owner.more.trainerPayoutsSubtitle"),
      icon: "cash-outline",
      testID: "owner-more-payouts",
      href: "/owner/payouts",
      visible: canManagePayouts,
    },
    {
      title: t("owner.more.stock"),
      subtitle: t("owner.more.stockSubtitle"),
      icon: "cube-outline",
      testID: "owner-more-stock",
      href: "/owner/stock",
      visible: canViewStock,
    },
    {
      title: t("owner.more.billing"),
      subtitle: t("owner.more.billingSubtitle"),
      icon: "card-outline",
      testID: "owner-more-billing",
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
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          <ScreenHeader
            title={t("nav.more")}
            trailing={<HeaderActions showBell />}
          />

          <SectionHeader title={t("owner.more.ownerTools")} />
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

          <SectionHeader title={t("owner.more.webControlRoom")} />
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
});
