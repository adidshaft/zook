import { Stack } from "expo-router";
import { RefreshControl, StyleSheet, Text } from "react-native";

import { EmptyState, GlassCard, IconBubble, ListRow, QueryErrorState, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RevenueSummary } from "@/features/owner/components/revenue-summary";
import { titleCase } from "@/features/owner/helpers";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgRecentPayments } from "@/lib/domains/payments";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatInr } from "@/lib/formatting";
import { colors, layout, typography } from "@/lib/theme";

export default function OwnerRevenueScreen() {
  const dashboardQuery = useOwnerDashboard();
  const paymentsQuery = useOrgRecentPayments();
  const ordersQuery = useOrgActiveShopOrders();
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
                tintColor={colors.brandLime}
                colors={[colors.brandLime]}
              />
            ),
          }}
        >
          <RevenueSummary revenuePaise={dashboardQuery.data?.summary?.revenuePaise ?? 0} payments={payments} />
          <SectionHeader title="Recent transactions" subtitle="Today" />
          <GlassCard contentStyle={styles.stack}>
            {paymentsQuery.isError || ordersQuery.isError ? (
              <QueryErrorState
                error={paymentsQuery.error ?? ordersQuery.error}
                onRetry={() => { void paymentsQuery.refetch(); void ordersQuery.refetch(); }}
              />
            ) : null}
            {!paymentsQuery.isError && payments.length
              ? payments.map((payment) => (
                  <ListRow
                    key={payment.id}
                    title={payment.user?.name ?? titleCase(payment.purpose)}
                    subtitle={`${titleCase(payment.mode)} · ${titleCase(payment.status)}`}
                    leading={<IconBubble icon="card-outline" tone={payment.status === "SUCCEEDED" ? "lime" : "amber"} />}
                    trailing={<Text style={styles.rowAmount}>{formatInr(payment.amountPaise)}</Text>}
                  />
                ))
              : null}
            {!ordersQuery.isError
              ? orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title={order.user?.name ?? "Shop pickup order"}
                    subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                    leading={<IconBubble icon="bag-outline" tone="lime" />}
                    trailing={<Text style={styles.rowAmount}>{formatInr(order.totalPaise)}</Text>}
                  />
                ))
              : null}
            {!paymentsQuery.isError && !ordersQuery.isError && !payments.length && !orders.length ? (
              <EmptyState title="No payments yet" body="Desk collections and payment confirmations will appear here." />
            ) : null}
          </GlassCard>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingTop: 14, gap: 14, paddingBottom: 96 },
  stack: { gap: 12 },
  rowAmount: { color: colors.textPrimary, ...typography.bodyStrong },
});
