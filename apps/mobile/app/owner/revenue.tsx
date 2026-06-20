import { Stack } from "expo-router";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  BranchSelectorChip,
  Card,
  IconBubble,
  ListRow,
  Skeleton,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { OwnerDashboardCharts } from "@/features/owner/components/dashboard-charts";
import { RevenueSummary } from "@/features/owner/components/revenue-summary";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgRecentPayments, useRefundPayment } from "@/lib/domains/payments";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatInr, titleCaseFromCode, toneForPaymentStatus, toneForShopOrderStatus } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

export default function OwnerRevenueScreen() {
  const { palette } = useTheme();
  const dashboardQuery = useOwnerDashboard();
  const paymentsQuery = useOrgRecentPayments();
  const ordersQuery = useOrgActiveShopOrders();
  const refundPayment = useRefundPayment();

  function confirmRefund(payment: { id: string; amountPaise?: number; user?: { name?: string | null } | null }) {
    Alert.alert(
      "Refund payment?",
      `Refund ${formatInr(payment.amountPaise ?? 0)} to ${payment.user?.name ?? "this member"}. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refund",
          style: "destructive",
          onPress: () =>
            refundPayment.mutate({ paymentId: payment.id, reason: "Refunded by gym" }),
        },
      ],
    );
  }
  const isLoading = dashboardQuery.isLoading || paymentsQuery.isLoading || ordersQuery.isLoading;
  const hasDashboardData = !isLoading && !dashboardQuery.isError;
  const payments = paymentsQuery.data?.payments ?? [];
  const orders = ordersQuery.data?.orders ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-revenue-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={paymentsQuery.isRefetching || ordersQuery.isRefetching}
                onRefresh={() => { void paymentsQuery.refetch(); void ordersQuery.refetch(); }}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <ScreenHeader
            title="Revenue"
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
          />
          {isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton height={18} width="38%" />
              <Skeleton height={36} width="52%" />
              <Skeleton height={52} />
              <Skeleton height={52} />
            </Card>
          ) : null}
          {hasDashboardData ? (
            <>
              <RevenueSummary
                revenuePaise={dashboardQuery.data?.summary?.revenuePaise ?? 0}
                payments={payments}
              />
              <OwnerDashboardCharts charts={dashboardQuery.data?.charts} />
            </>
          ) : null}
          {!isLoading ? (
            <>
              <SectionHeader title="Recent transactions" />
              <Card contentStyle={styles.stack}>
                {dashboardQuery.isError || paymentsQuery.isError || ordersQuery.isError ? (
                  <QueryErrorState
                    error={dashboardQuery.error ?? paymentsQuery.error ?? ordersQuery.error}
                    onRetry={() => {
                      void dashboardQuery.refetch();
                      void paymentsQuery.refetch();
                      void ordersQuery.refetch();
                    }}
                  />
                ) : null}
                {!dashboardQuery.isError && !paymentsQuery.isError && payments.length
                  ? payments.map((payment) => {
                      const refundable = (payment.status ?? "").toUpperCase() === "SUCCEEDED";
                      const subtitle = `${titleCaseFromCode(payment.mode)} · ${titleCaseFromCode(payment.status)}${refundable ? " · Tap to refund" : ""}`;
                      const row = (
                        <ListRow
                          title={payment.user?.name ?? titleCaseFromCode(payment.purpose)}
                          subtitle={subtitle}
                          leading={<IconBubble icon="card-outline" tone={toneForPaymentStatus(payment.status)} />}
                          trailing={
                            <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                              {formatInr(payment.amountPaise)}
                            </Text>
                          }
                        />
                      );
                      return refundable ? (
                        <Pressable
                          key={payment.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Refund ${payment.user?.name ?? "payment"}`}
                          onPress={() => confirmRefund(payment)}
                          style={({ pressed }) => (pressed ? styles.rowPressed : null)}
                        >
                          {row}
                        </Pressable>
                      ) : (
                        <View key={payment.id}>{row}</View>
                      );
                    })
                  : null}
                {!dashboardQuery.isError && !ordersQuery.isError
                  ? orders.map((order) => (
                      <ListRow
                        key={order.id}
                        title={order.user?.name ?? "Shop pickup order"}
                        subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCaseFromCode(order.status)}`}
                        leading={<IconBubble icon="bag-outline" tone={toneForShopOrderStatus(order.status)} />}
                        trailing={
                          <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                            {formatInr(order.totalPaise)}
                          </Text>
                        }
                      />
                    ))
                  : null}
                {!dashboardQuery.isError && !paymentsQuery.isError && !ordersQuery.isError && !payments.length && !orders.length ? (
                  <EmptyState title="No payments" />
                ) : null}
              </Card>
            </>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: { alignItems: "flex-start", gap: spacing.xs },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  loadingCard: { gap: spacing.md },
  stack: { gap: spacing.md },
  rowAmount: typography.bodyStrong,
  rowPressed: { opacity: 0.7 },
});
