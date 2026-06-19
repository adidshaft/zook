import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Linking, RefreshControl, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { AttentionCard, type AttentionItem } from "@/components/domain/attention";
import { MetricGrid, type MetricTileItem } from "@/components/domain/metric-grid";
import { AnimatedAppear, BranchSelectorChip, Card, EmptyState, QueryErrorState, ScreenHeader, SetupChecklist, StatusChip, ZookButton, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useOwnerBillingSubscription, useOwnerDashboard, useOwnerSetupStatus, usePrefetchOwnerWorkspace } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { formatBranchName, formatCompactNumber, formatInr, titleCaseFromCode, toneForSaasSubscriptionStatus } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { useAuth, useHasPermission } from "@/lib/auth";
import { useRoleContext } from "@/lib/role-context";
import { useSharedValue } from "@/lib/reanimated-lite";
import { OwnerDashboardCharts } from "@/features/owner/components/dashboard-charts";

export default function OwnerCommandScreen() {
  const router = useRouter();
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
          label: "Create membership plans",
          done: setupStatus.hasMembershipPlans,
          onPress: () => void Linking.openURL("https://zookfit.in/dashboard/membership-plans"),
        },
        {
          id: "qr",
          label: "Display your check-in QR",
          done: setupStatus.hasQrDisplayed,
          onPress: () => void Linking.openURL("https://zookfit.in/dashboard/attendance/qr-display"),
        },
        {
          id: "staff",
          label: "Invite staff",
          done: setupStatus.staffCount > 1,
          onPress: () => void Linking.openURL("https://zookfit.in/dashboard/staff"),
        },
        {
          id: "join",
          label: "Share your join link",
          done: setupStatus.memberCount > 1,
          onPress: () => {
            const username = roleContext?.org?.username;
            const url = username ? `https://zookfit.in/g/${username}` : "https://zookfit.in";
            void Share.share({ message: `Join my gym on Zook: ${url}`, url });
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
          title: "Approvals waiting",
          subtitle: `${joinRequests.length} join ${joinRequests.length === 1 ? "request" : "requests"} · ${attentionAttempts.length} scan ${attentionAttempts.length === 1 ? "review" : "reviews"}`,
          tone: "amber",
          icon: "checkmark-done-outline",
          cta: { label: "Approvals", onPress: () => router.push("/owner/approvals") },
        }
      : null,
    paymentExceptionCount > 0
      ? {
          id: "revenue",
          title: "Payment exceptions",
          subtitle: `${paymentExceptionCount} ${paymentExceptionCount === 1 ? "transaction needs" : "transactions need"} review`,
          tone: "amber",
          icon: "card-outline",
          cta: { label: "Open", onPress: () => router.push("/owner/revenue") },
        }
      : null,
    lowStock.length > 0
      ? {
          id: "stock",
          title: "Low stock",
          subtitle: `${lowStock.length} ${lowStock.length === 1 ? "product is" : "products are"} under threshold`,
          tone: "amber",
          icon: "cube-outline",
          cta: { label: "Open", onPress: () => router.push("/owner/stock") },
        }
      : null,
    expiringSoon > 0
      ? {
          id: "memberships",
          title: "Expiring soon",
          subtitle: `${expiringSoon} active ${expiringSoon === 1 ? "membership" : "memberships"} in the next 7 days`,
          tone: "blue",
          icon: "time-outline",
          cta: { label: "Open", onPress: () => router.push("/owner/members?filter=expiring" as never) },
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
    "Main branch";
  const orgName = roleContext?.org?.name ?? "Gym";
  const branchLabel = formatBranchName(orgName, branchName, {
    collapseOrgMatch: true,
    fallback: "Main branch",
  });
  const metrics: MetricTileItem[] = [
    {
      label: "Active members",
      value: formatCompactNumber(dashboard?.summary?.activeMembers ?? 0),
      hint: branchLabel ?? undefined,
      tone: "blue",
      icon: "people-outline",
      onPress: () => router.push("/owner/members"),
    },
    {
      label: "Today check-ins",
      value: formatCompactNumber(dashboard?.summary?.todayAttendance ?? 0),
      hint:
        (dashboard?.summary?.pendingAttendanceApprovals ?? 0) > 0
          ? `${dashboard?.summary?.pendingAttendanceApprovals ?? 0} pending ${(dashboard?.summary?.pendingAttendanceApprovals ?? 0) === 1 ? "review" : "reviews"}`
          : undefined,
      tone: "blue",
      icon: "qr-code-outline",
      onPress: () => router.push("/owner/approvals"),
    },
    {
      label: "Revenue",
      value: formatInr(dashboard?.summary?.revenuePaise ?? 0),
      hint: "Collected + pickup",
      tone: "amber",
      icon: "trending-up-outline",
      onPress: () => router.push("/owner/revenue"),
    },
    {
      label: "Approvals",
      value: pendingApprovals,
      hint: pendingApprovals > 0 ? "Needs attention" : undefined,
      tone: "violet",
      icon: "checkmark-done-outline",
      onPress: () => router.push("/owner/approvals"),
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
            title="Today"
            subtitle={orgName}
            titleAccessory={<BranchSelectorChip />}
            scrollY={scrollY}
          />
          {dashboardQuery.isLoading ? <OwnerDashboardSkeleton /> : null}
          {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
              {dashboard ? (
            <>
              {showSetupChecklist ? (
                <AnimatedAppear delay={0}>
                  <SetupChecklist title="Finish gym setup" steps={setupSteps} />
                </AnimatedAppear>
              ) : null}
              {!billingReady ? (
                <AnimatedAppear delay={showSetupChecklist ? 40 : 0}>
                  <Card variant="warning" contentStyle={styles.billingCard}>
                    <View style={styles.billingHeader}>
                      <View style={styles.billingCopy}>
                        <Text style={[styles.billingTitle, { color: palette.text.primary }]}>Billing setup required</Text>
                        <Text style={[styles.billingBody, { color: palette.text.secondary }]}>
                          Trial access is on, but owner/admin writes need a SaaS mandate before the
                          gym can operate normally.
                        </Text>
                      </View>
                      <StatusChip
                        status={subscription ? titleCaseFromCode(subscription.status) : "Setup"}
                        tone={toneForSaasSubscriptionStatus(subscription?.status)}
                      />
                    </View>
                    <ZookButton
                      size="sm"
                      icon="card-outline"
                      onPress={() => router.push("/owner/billing" as never)}
                    >
                      Open billing
                    </ZookButton>
                  </Card>
                </AnimatedAppear>
              ) : null}
              <AnimatedAppear delay={80}>
                <MetricGrid testID="owner-view-command" items={metrics} />
              </AnimatedAppear>
              <AnimatedAppear delay={120}>
                {items.length ? (
                  <AttentionCard items={items} />
                ) : (
                  <Card variant="compact">
                    <EmptyState
                      icon="checkmark-done-outline"
                      title="All clear"
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
});
