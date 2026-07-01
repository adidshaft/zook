import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  HeaderActions,
  ListRow,
  Pill,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { WebHandoffRow } from "@/components/web-handoff-row";
import { useHasPermission } from "@/lib/auth";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, useTheme } from "@/lib/theme";

type MoreRow = {
  testID?: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: "/owner/members" | "/owner/approvals" | "/owner/revenue" | "/owner/stock" | "/owner/billing" | "/owner/payouts" | "/owner/referrals" | "/owner/plans" | "/owner/exercise-library" | "/owner/coupons" | "/owner/staff" | "/owner/entry-qr" | "/rewards";
  webPath?: string;
  visible?: boolean;
};

type MoreRowGroup = {
  titleKey: TranslationKey;
  rows: MoreRow[];
  defaultOpen?: boolean;
};

function NativeRowGroup({ group }: { group: MoreRowGroup; }) {
  const { t } = useI18n();
  const { palette } = useTheme();
  const [open, setOpen] = useState(group.defaultOpen ?? false);
  const visibleRows = group.rows.filter((row) => row.visible !== false);
  if (!visibleRows.length) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [styles.groupHeader, pressed ? styles.pressed : null]}
      >
        <SectionHeader
          title={t(group.titleKey)}
          action={
            <View style={styles.groupHeaderAction}>
              <Pill tone="neutral">{visibleRows.length}</Pill>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </View>
          }
        />
      </Pressable>
      {open ? (
        <Card variant="compact" contentStyle={styles.list}>
          {visibleRows.map((row) => (
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
      ) : null}
    </>
  );
}

export default function OwnerMoreScreen() {
  const { t } = useI18n();
  const { palette } = useTheme();
  const bottomPadding = useBottomScrollPadding();
  const canViewStock = useHasPermission("SHOP_MANAGE_PRODUCTS");
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const canManagePayouts = useHasPermission("TRAINERS_MANAGE");
  const canManageReferrals = useHasPermission("REFERRALS_MANAGE");
  const canManagePlans = useHasPermission("MEMBERSHIP_PLAN_MANAGE");
  const canManageCoupons = useHasPermission("COUPONS_MANAGE");
  const canManageStaff = useHasPermission("ORG_MANAGE_STAFF");
  const canDisplayQr = useHasPermission("ATTENDANCE_QR_DISPLAY");
  const canViewRevenue = useHasPermission("ORG_VIEW_REPORTS");
  const webRows: MoreRow[] = [
    { title: t("owner.more.reports"), subtitle: t("owner.more.reportsSubtitle"), icon: "document-text-outline", webPath: "/dashboard/reports" },
    { title: t("owner.more.notificationTemplates"), subtitle: t("owner.more.notificationTemplatesSubtitle"), icon: "mail-outline", webPath: "/dashboard/notifications/templates" },
  ];
  const nativeRowGroups: MoreRowGroup[] = [
    {
      titleKey: "owner.more.groupDailyWork",
      defaultOpen: true,
      rows: [
        {
          title: t("owner.more.members"),
          subtitle: t("owner.more.membersSubtitle"),
          icon: "people-outline",
          testID: "owner-more-members",
          href: "/owner/members",
        },
        {
          title: t("owner.more.approvals"),
          subtitle: t("owner.more.approvalsSubtitle"),
          icon: "checkmark-done-outline",
          testID: "owner-more-approvals",
          href: "/owner/approvals",
        },
        {
          title: t("owner.more.revenue"),
          subtitle: t("owner.more.revenueSubtitle"),
          icon: "trending-up-outline",
          testID: "owner-more-revenue",
          href: "/owner/revenue",
          visible: canViewRevenue,
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
          title: t("owner.more.entryQr"),
          subtitle: t("owner.more.entryQrSubtitle"),
          icon: "qr-code-outline",
          testID: "owner-more-entry-qr",
          href: "/owner/entry-qr",
          visible: canDisplayQr,
        },
      ],
    },
    {
      titleKey: "owner.more.groupOperations",
      rows: [
        {
          title: t("owner.more.staff"),
          subtitle: t("owner.more.staffSubtitle"),
          icon: "people-circle-outline",
          testID: "owner-more-staff",
          href: "/owner/staff",
          visible: canManageStaff,
        },
      ],
    },
    {
      titleKey: "owner.more.groupCatalog",
      rows: [
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
      ],
    },
    {
      titleKey: "owner.more.groupFinance",
      rows: [
        {
          title: t("owner.more.trainerPayouts"),
          subtitle: t("owner.more.trainerPayoutsSubtitle"),
          icon: "cash-outline",
          testID: "owner-more-payouts",
          href: "/owner/payouts",
          visible: canManagePayouts,
        },
        {
          title: t("owner.more.billing"),
          subtitle: t("owner.more.billingSubtitle"),
          icon: "card-outline",
          testID: "owner-more-billing",
          href: "/owner/billing",
          visible: canManageBilling,
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
          title: t("owner.more.referGym"),
          subtitle: t("owner.more.referGymSubtitle"),
          icon: "gift-outline",
          testID: "owner-more-rewards",
          href: "/rewards",
        },
      ],
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
            titleScale="compact"
            hideExpandedTitle
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          <SectionHeader
            title={t("owner.more.branches")}
            action={<Pill tone="neutral">{t("branch.currentGym")}</Pill>}
          />
          <Card variant="compact" contentStyle={styles.setupCard}>
            <Text style={[styles.setupNote, { color: palette.text.secondary }]}>
              {t("branch.gymSubscriptionScope")}
            </Text>
            <WebHandoffRow title={t("owner.more.branchesSubtitle")} path="/dashboard/branches" />
          </Card>

          {nativeRowGroups.map((group) => (
            <NativeRowGroup key={group.titleKey} group={group} />
          ))}

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
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
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
  setupCard: {
    gap: spacing.sm,
  },
  setupNote: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  groupHeader: {
    marginBottom: -spacing.sm,
  },
  groupHeaderAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.78,
  },
});
