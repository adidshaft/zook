import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { RefreshControl, StyleSheet, Text } from "react-native";

import { DemoBanner } from "@/components/demo-banner";
import { QueryErrorState, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherChip } from "@/components/role-switcher";
import { OwnerDashboardSkeleton } from "@/components/skeletons";
import { AttentionCard, type AttentionItem } from "@/features/owner/components/attention-card";
import { CommandMetrics } from "@/features/owner/components/command-metrics";
import { useOrgAttendancePending } from "@/lib/domains/attendance";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { colors, layout, typography } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export default function OwnerCommandScreen() {
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
      count: pendingApprovals,
      tone: pendingApprovals ? "amber" : "lime",
      icon: "checkmark-done-outline",
      target: "/owner/approvals",
    },
    {
      id: "revenue",
      title: "Payment exceptions",
      subtitle: paymentExceptionCount
        ? `${paymentExceptionCount} ${paymentExceptionCount === 1 ? "transaction needs" : "transactions need"} review`
        : "No transactions need review",
      count: paymentExceptionCount,
      tone: paymentExceptionCount ? "amber" : "lime",
      icon: "card-outline",
      target: "/owner/revenue",
    },
    {
      id: "stock",
      title: "Low stock",
      subtitle: `${lowStock.length} ${lowStock.length === 1 ? "product is" : "products are"} under threshold`,
      count: lowStock.length,
      tone: lowStock.length ? "amber" : "lime",
      icon: "cube-outline",
      target: "/owner/stock",
    },
    {
      id: "memberships",
      title: "Expiring soon",
      subtitle: `${expiringSoon} active ${expiringSoon === 1 ? "membership" : "memberships"} in the next 7 days`,
      count: expiringSoon,
      tone: expiringSoon ? "blue" : "neutral",
      icon: "time-outline",
      target: "/owner/revenue",
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
                tintColor={colors.brandLime}
                colors={[colors.brandLime]}
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
              <CommandMetrics dashboard={dashboard} pendingApprovals={pendingApprovals} />
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
    color: colors.textMuted,
    ...typography.caption,
  },
});
