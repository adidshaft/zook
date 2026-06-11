import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AttentionCard, type AttentionItem } from "@/components/domain/attention";
import { MetricGrid, type MetricTileItem } from "@/components/domain/metric-grid";
import { GlassCard, QueryErrorState, StatusChip, ZookButton, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useOwnerBillingSubscription, useOwnerDashboard, usePrefetchOwnerWorkspace } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import { layout, typography, useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { OwnerDashboardCharts } from "@/features/owner/components/dashboard-charts";

export default function OwnerCommandScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAuth();
  const { palette } = useTheme();
  const dashboardQuery = useOwnerDashboard();
  const billingQuery = useOwnerBillingSubscription();
  const prefetchOwnerWorkspace = usePrefetchOwnerWorkspace();
  const attentionQuery = useOrgAttendancePending();
  const paymentsQuery = useOrgRecentPayments();
  const dashboard = dashboardQuery.data;
  const joinRequests = (dashboard?.joinRequests ?? []).filter(
    (request) => String(request.status ?? "").toLowerCase() === "pending",
  );
  const attentionAttempts = attentionQuery.data?.records ?? [];
  const lowStock = dashboard?.products ?? [];
  const expiringSoon = dashboard?.summary?.expiringMemberships ?? 0;
  const paymentExceptionCount =
    paymentsQuery.data?.payments.filter((payment) => payment.status !== "SUCCEEDED").length ?? 0;
  const pendingApprovals = joinRequests.length + attentionAttempts.length;

  useEffect(() => {
    prefetchOwnerWorkspace();
  }, [prefetchOwnerWorkspace]);

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (rawView === "members") router.replace("/owner/members");
    if (rawView === "approvals") router.replace("/owner/approvals");
    if (rawView === "revenue") router.replace("/owner/revenue");
    if (rawView === "stock") router.replace("/owner/stock");
  }, [params.view, router]);

  const items: AttentionItem[] = [
    {
      id: "approvals",
      title: "Approvals waiting",
      subtitle: `${joinRequests.length} join ${joinRequests.length === 1 ? "request" : "requests"} · ${attentionAttempts.length} scan ${attentionAttempts.length === 1 ? "review" : "reviews"}`,
      tone: pendingApprovals ? "amber" : "lime",
      icon: "checkmark-done-outline",
      cta: { label: pendingApprovals ? "Review" : "Open", onPress: () => router.replace("/owner/approvals") },
    },
    {
      id: "revenue",
      title: "Payment exceptions",
      subtitle: paymentExceptionCount
        ? `${paymentExceptionCount} ${paymentExceptionCount === 1 ? "transaction needs" : "transactions need"} review`
        : "No transactions need review",
      tone: paymentExceptionCount ? "amber" : "lime",
      icon: "card-outline",
      cta: { label: paymentExceptionCount ? "Review" : "Open", onPress: () => router.replace("/owner/revenue") },
    },
    {
      id: "stock",
      title: "Low stock",
      subtitle: `${lowStock.length} ${lowStock.length === 1 ? "product is" : "products are"} under threshold`,
      tone: lowStock.length ? "amber" : "lime",
      icon: "cube-outline",
      cta: { label: lowStock.length ? "Review" : "Open", onPress: () => router.replace("/owner/stock") },
    },
    {
      id: "memberships",
      title: "Expiring soon",
      subtitle: `${expiringSoon} active ${expiringSoon === 1 ? "membership" : "memberships"} in the next 7 days`,
      tone: expiringSoon ? "blue" : "neutral",
      icon: "time-outline",
      cta: { label: expiringSoon ? "Review" : "Open", onPress: () => router.replace("/owner/revenue") },
    },
  ];
  const mandateStatus = billingQuery.data?.mandate?.status ?? null;
  const subscription = billingQuery.data?.subscription;
  const billingReady =
    subscription?.status === "ACTIVE" ||
    (mandateStatus &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        mandateStatus,
      ));
  const branchName =
    dashboard?.branchScope?.selectedBranch?.name ??
    dashboard?.branchScope?.defaultBranch?.name ??
    "Main branch";
  const metrics: MetricTileItem[] = [
    {
      label: "Active members",
      value: formatCompactNumber(dashboard?.summary?.activeMembers ?? 0),
      hint: branchName,
      tone: "lime",
      icon: "people-outline",
      onPress: () => router.replace("/owner/members"),
    },
    {
      label: "Today check-ins",
      value: formatCompactNumber(dashboard?.summary?.todayAttendance ?? 0),
      hint: `${dashboard?.summary?.pendingAttendanceApprovals ?? 0} pending review`,
      tone: "blue",
      icon: "qr-code-outline",
      onPress: () => router.replace("/owner/approvals"),
    },
    {
      label: "Revenue",
      value: formatInr(dashboard?.summary?.revenuePaise ?? 0),
      hint: "Collected + pickup",
      tone: "amber",
      icon: "trending-up-outline",
      onPress: () => router.replace("/owner/revenue"),
    },
    {
      label: "Approvals",
      value: pendingApprovals,
      hint: "Needs attention",
      tone: "violet",
      icon: "checkmark-done-outline",
      onPress: () => router.replace("/owner/approvals"),
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
          <Text style={[styles.headerMeta, { color: palette.text.secondary }]}>
            {dashboard?.organization?.name ?? "Active gym"} · Owner command view
          </Text>
          <RoleSwitcherChip />
          {dashboardQuery.isLoading ? <OwnerDashboardSkeleton /> : null}
          {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
          {dashboard ? (
            <>
              {!billingReady ? (
                <GlassCard variant="warning" contentStyle={styles.billingCard}>
                  <View style={styles.billingHeader}>
                    <View style={styles.billingCopy}>
                      <Text style={[styles.billingTitle, { color: palette.text.primary }]}>Billing setup required</Text>
                      <Text style={[styles.billingBody, { color: palette.text.secondary }]}>
                        Trial access is on, but owner/admin writes need a SaaS mandate before the
                        gym can operate normally.
                      </Text>
                    </View>
                    <StatusChip status={subscription?.status ?? "SETUP"} tone="amber" />
                  </View>
                  <ZookButton
                    size="sm"
                    icon="card-outline"
                    onPress={() => router.replace("/owner/billing" as never)}
                  >
                    Open billing
                  </ZookButton>
                </GlassCard>
              ) : null}
              <MetricGrid testID="owner-view-command" items={metrics} />
              <AttentionCard items={items} />
              <OwnerDashboardCharts charts={dashboard.charts} />
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
    paddingTop: 14,
    gap: 14,
    paddingBottom: 96,
  },
  headerMeta: {
    ...typography.caption,
  },
  billingCard: {
    gap: 12,
  },
  billingHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  billingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  billingTitle: {
    ...typography.cardTitle,
  },
  billingBody: {
    ...typography.body,
  },
});
