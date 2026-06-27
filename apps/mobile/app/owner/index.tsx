import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Pressable, RefreshControl, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AttentionCard, type AttentionItem } from "@/components/domain/attention";
import { MetricGrid, type MetricTileItem } from "@/components/domain/metric-grid";
import { AnimatedAppear, BranchSelectorChip, Card, EmptyState, HeaderActions, QueryErrorState, ScreenHeader, SetupChecklist, StatusChip, ZookButton, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useOwnerBillingSubscription, useOwnerDashboard, useOwnerSetupStatus, usePrefetchOwnerWorkspace } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { formatBranchName, formatCompactNumber, formatInr, titleCaseFromCode, toneForSaasSubscriptionStatus } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { useAuth, useHasPermission } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useSharedValue } from "@/lib/reanimated-lite";
import { OwnerDashboardCharts } from "@/features/owner/components/dashboard-charts";

export default function OwnerCommandScreen() {
  const router = useRouter();
  const t = useT();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAuth();
  const canManageBilling = useHasPermission("ORG_MANAGE_BILLING");
  const roleContext = useRoleContext();
  const { palette } = useTheme();
  const dashboardQuery = useOwnerDashboard();
  const scrollY = useSharedValue(0);
  const billingQuery = useOwnerBillingSubscription();
  const setupStatusQuery = useOwnerSetupStatus();
  const prefetchOwnerWorkspace = usePrefetchOwnerWorkspace();
  const attentionQuery = useOrgAttendancePending();
  const paymentsQuery = useOrgRecentPayments();
  const dashboard = dashboardQuery.data;
  const joinRequests = (dashboard?.joinRequests ?? []).filter(
    (request) => String(request.status ?? "").toLowerCase() === "pending",
  );
  const attentionAttempts = (attentionQuery.data?.records ?? []).filter((record) => {
    const status = String(record.status ?? "").toUpperCase();
    return status === "PENDING_APPROVAL" || status === "FLAGGED";
  });
  const lowStock = (dashboard?.products ?? []).filter(
    (product) => (product.stock ?? 0) <= (product.lowStockThreshold ?? 0),
  );
  const expiringSoon = dashboard?.summary?.expiringMemberships ?? 0;
  const paymentExceptionCount =
    paymentsQuery.data?.payments.filter((payment) => payment.status !== "SUCCEEDED").length ?? 0;
  const pendingApprovals = joinRequests.length + attentionAttempts.length;
  const setupStatus = setupStatusQuery.data;
  const setupSteps = setupStatus
    ? [
        {
          id: "plans",
          label: t("owner.home.createMembershipPlans"),
          done: setupStatus.hasMembershipPlans,
          onPress: () => router.push("/owner/plans"),
        },
        {
          id: "qr",
          label: t("owner.home.displayCheckInQr"),
          done: setupStatus.hasQrDisplayed,
          onPress: () => router.push("/owner/entry-qr"),
        },
        {
          id: "staff",
          label: t("owner.home.inviteStaff"),
          done: setupStatus.staffCount > 1,
          onPress: () => router.push("/owner/staff"),
        },
        {
          id: "join",
          label: t("owner.home.shareJoinLink"),
          done: setupStatus.memberCount > 1,
          onPress: () => {
            const username = roleContext?.org?.username;
            const url = username ? `https://zookfit.in/g/${username}` : "https://zookfit.in";
            void Share.share({ message: t("owner.home.shareJoinMessage", { url }), url });
          },
        },
      ]
    : [];
  const showSetupChecklist = setupSteps.length > 0 && setupSteps.some((step) => !step.done);

  useEffect(() => {
    prefetchOwnerWorkspace();
  }, [prefetchOwnerWorkspace]);

  const maybeAttentionItems: Array<AttentionItem | null> = [
    pendingApprovals > 0
      ? {
          id: "approvals",
          title: t("owner.home.approvalsWaiting"),
          subtitle: t("owner.home.approvalsWaitingSubtitle", {
            join: joinRequests.length,
            joinLabel: joinRequests.length === 1 ? t("owner.home.request") : t("owner.home.requests"),
            scans: attentionAttempts.length,
            scanLabel: attentionAttempts.length === 1 ? t("owner.home.review") : t("owner.home.reviews"),
          }),
          tone: "amber",
          icon: "checkmark-done-outline",
          cta: { label: t("owner.home.approvals"), onPress: () => router.push("/owner/approvals") },
        }
      : null,
    paymentExceptionCount > 0
      ? {
          id: "revenue",
          title: t("owner.home.paymentExceptions"),
          subtitle: t("owner.home.paymentExceptionsSubtitle", {
            count: paymentExceptionCount,
            action: paymentExceptionCount === 1 ? t("owner.home.transactionNeeds") : t("owner.home.transactionsNeed"),
          }),
          tone: "amber",
          icon: "card-outline",
          cta: { label: t("owner.home.open"), onPress: () => router.push("/owner/revenue") },
        }
      : null,
    lowStock.length > 0
      ? {
          id: "stock",
          title: t("owner.home.lowStock"),
          subtitle: t("owner.home.lowStockSubtitle", {
            count: lowStock.length,
            label: lowStock.length === 1 ? t("owner.home.productIs") : t("owner.home.productsAre"),
          }),
          tone: "amber",
          icon: "cube-outline",
          cta: { label: t("owner.home.open"), onPress: () => router.push("/owner/stock") },
        }
      : null,
    expiringSoon > 0
      ? {
          id: "memberships",
          title: t("owner.home.expiringSoon"),
          subtitle: t("owner.home.expiringSoonSubtitle", {
            count: expiringSoon,
            label: expiringSoon === 1 ? t("owner.home.membership") : t("owner.home.memberships"),
          }),
          tone: "blue",
          icon: "time-outline",
          cta: { label: t("owner.home.open"), onPress: () => router.push("/owner/members?filter=expiring" as never) },
        }
      : null,
  ];
  const items = maybeAttentionItems.filter((item): item is AttentionItem => Boolean(item));
  const mandateStatus = billingQuery.data?.mandate?.status ?? null;
  const subscription = billingQuery.data?.subscription;
  const billingReady =
    !canManageBilling ||
    subscription?.status === "ACTIVE" ||
    (mandateStatus &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        mandateStatus,
      ));
  const branchName =
    dashboard?.branchScope?.selectedBranch?.name ??
    dashboard?.branchScope?.defaultBranch?.name ??
    t("owner.home.mainBranch");
  const orgName = roleContext?.org?.name ?? t("owner.home.gymFallback");
  const branchLabel = formatBranchName(orgName, branchName, {
    collapseOrgMatch: true,
    fallback: t("owner.home.mainBranch"),
  });
  const metrics: MetricTileItem[] = [
    {
      label: t("owner.home.activeMembers"),
      value: formatCompactNumber(dashboard?.summary?.activeMembers ?? 0),
      hint: branchLabel ?? undefined,
      tone: "blue",
      icon: "people-outline",
      onPress: () => router.push("/owner/members"),
    },
    {
      label: t("owner.home.todayCheckIns"),
      value: formatCompactNumber(dashboard?.summary?.todayAttendance ?? 0),
      hint:
        (dashboard?.summary?.pendingAttendanceApprovals ?? 0) > 0
          ? t("owner.home.pendingReviews", {
              count: dashboard?.summary?.pendingAttendanceApprovals ?? 0,
              label: (dashboard?.summary?.pendingAttendanceApprovals ?? 0) === 1 ? t("owner.home.review") : t("owner.home.reviews"),
            })
          : undefined,
      tone: "blue",
      icon: "qr-code-outline",
      onPress: () => router.push("/owner/approvals"),
    },
    {
      label: t("owner.home.revenue"),
      value: formatInr(dashboard?.summary?.revenuePaise ?? 0),
      hint: t("owner.home.collectedPickup"),
      tone: "amber",
      icon: "trending-up-outline",
      onPress: () => router.push("/owner/revenue"),
    },
    {
      label: t("owner.home.approvals"),
      value: pendingApprovals,
      hint: pendingApprovals > 0 ? t("owner.home.needsAttention") : undefined,
      tone: "violet",
      icon: "checkmark-done-outline",
      onPress: () => router.push("/owner/approvals"),
    },
  ];
  const todayItems = [
    {
      label: t("owner.home.todayCheckIns"),
      value: formatCompactNumber(dashboard?.today?.checkIns ?? dashboard?.summary?.todayAttendance ?? 0),
      onPress: () => router.push("/owner/approvals"),
    },
    {
      label: t("owner.home.approvals"),
      value: formatCompactNumber(dashboard?.today?.pendingApprovals ?? dashboard?.summary?.pendingAttendanceApprovals ?? 0),
      onPress: () => router.push("/owner/approvals"),
    },
    {
      label: t("shop.pickupLabel"),
      value: formatCompactNumber(dashboard?.today?.openOrders ?? 0),
      onPress: () => router.push("/owner/orders" as never),
    },
  ];

  const onRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: activeOrgId ? ["org", activeOrgId] : ["org"] });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-home-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            onScroll: (event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
            },
            scrollEventThrottle: 16,
            refreshControl: (
              <RefreshControl
                refreshing={dashboardQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <ScreenHeader
            title={t("owner.home.today")}
            subtitle={orgName}
            titleAccessory={<BranchSelectorChip />}
            trailing={<HeaderActions showBell />}
            scrollY={scrollY}
          />
          {dashboardQuery.isLoading ? <OwnerDashboardSkeleton /> : null}
          {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
              {dashboard ? (
            <>
              {showSetupChecklist ? (
                <AnimatedAppear delay={0}>
                  <SetupChecklist title={t("owner.home.finishGymSetup")} steps={setupSteps} />
                </AnimatedAppear>
              ) : null}
              {!billingReady ? (
                <AnimatedAppear delay={showSetupChecklist ? 40 : 0}>
                  <Card variant="warning" contentStyle={styles.billingCard}>
                    <View style={styles.billingHeader}>
                      <View style={styles.billingCopy}>
                        <Text style={[styles.billingTitle, { color: palette.text.primary }]}>
                          {t("owner.home.billingSetupRequired")}
                        </Text>
                        <Text style={[styles.billingBody, { color: palette.text.secondary }]}>
                          {t("owner.home.billingSetupBody")}
                        </Text>
                      </View>
                      <StatusChip
                        status={subscription ? titleCaseFromCode(subscription.status) : t("owner.home.setup")}
                        tone={toneForSaasSubscriptionStatus(subscription?.status)}
                      />
                    </View>
                    <ZookButton
                      size="sm"
                      icon="card-outline"
                      onPress={() => router.push("/owner/billing" as never)}
                    >
                      {t("owner.home.openBilling")}
                    </ZookButton>
                  </Card>
                </AnimatedAppear>
              ) : null}
              <AnimatedAppear delay={60}>
                <Card variant="compact" contentStyle={styles.todayCard}>
                  <Text style={[styles.todayTitle, { color: palette.text.primary }]}>
                    {t("owner.home.today")}
                  </Text>
                  <View style={styles.todayRow}>
                    {todayItems.map((item) => (
                      <Pressable
                        key={item.label}
                        accessibilityRole="button"
                        onPress={item.onPress}
                        style={({ pressed }) => [
                          styles.todayChip,
                          {
                            backgroundColor: palette.bg.sunken,
                            borderColor: palette.border.subtle,
                          },
                          pressed ? styles.todayChipPressed : null,
                        ]}
                      >
                        <Text style={[styles.todayValue, { color: palette.text.primary }]}>
                          {item.value}
                        </Text>
                        <Text numberOfLines={1} style={[styles.todayLabel, { color: palette.text.secondary }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>
              </AnimatedAppear>
              <AnimatedAppear delay={80}>
                <MetricGrid testID="owner-view-command" items={metrics} />
              </AnimatedAppear>
              <AnimatedAppear delay={120}>
                {items.length ? (
                  <AttentionCard items={items} />
                ) : (
                  <Card variant="compact">
                    <EmptyState
                      title={t("owner.home.allClear")}
                    />
                  </Card>
                )}
              </AnimatedAppear>
              <AnimatedAppear delay={160}>
                <OwnerDashboardCharts charts={dashboard.charts} />
              </AnimatedAppear>
            </>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.md,
    paddingBottom: 96,
  },
  billingCard: {
    gap: spacing.sm,
  },
  billingHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  billingCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  billingTitle: {
    ...typography.cardTitle,
  },
  billingBody: {
    ...typography.body,
  },
  todayCard: {
    gap: spacing.sm,
  },
  todayTitle: {
    ...typography.cardTitle,
  },
  todayRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  todayChip: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    minHeight: 72,
    justifyContent: "center",
    padding: spacing.sm,
  },
  todayChipPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  todayValue: {
    ...typography.metric,
  },
  todayLabel: {
    ...typography.caption,
  },
});
