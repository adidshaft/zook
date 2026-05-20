import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { RefreshControl, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { AttentionCard, type AttentionItem } from "@/components/domain/attention";
import { MetricGrid, type MetricTileItem } from "@/components/domain/metric-grid";
import { DemoBanner } from "@/components/demo-banner";
import { QueryErrorState, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { formatCompactNumber, formatInr } from "@/lib/formatting";
import { legacyColors, layout, typography } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export default function OwnerCommandScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId } = useAuth();
  const dashboardQuery = useOwnerDashboard();
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
      <ZookScreen testID="owner-command-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={dashboardQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={legacyColors.brandLime}
                colors={[legacyColors.brandLime]}
              />
            ),
          }}
        >
          <DemoBanner />
          <Text style={styles.headerMeta}>{dashboard?.organization?.name ?? "Active gym"} · Owner command view</Text>
          <RoleSwitcherChip />
          {dashboardQuery.isLoading ? <OwnerDashboardSkeleton /> : null}
          {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
          {dashboard ? (
            <>
              <MetricGrid testID="owner-view-command" items={metrics} />
              <AttentionCard items={items} />
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
    color: legacyColors.textMuted,
    ...typography.caption,
  },
});
