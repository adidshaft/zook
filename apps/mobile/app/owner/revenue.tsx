import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  BranchSelectorChip,
  Card,
  HeaderActions,
  IconBubble,
  ListRow,
  Pill,
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
import { paymentModeLabel, paymentStatusLabel } from "@/components/membership/helpers";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgRecentPayments, useRefundPayment } from "@/lib/domains/payments";
import type { OrgPaymentRecord, ShopOrderRecord } from "@/lib/domains/shared/types";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatDateTime, formatInr, titleCaseFromCode, toneForPaymentStatus, toneForShopOrderStatus } from "@/lib/formatting";
import { type TranslationKey, useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TransactionFeedItem =
  | { id: string; kind: "payment"; createdAt?: string | null; payment: OrgPaymentRecord }
  | { id: string; kind: "order"; createdAt?: string | null; order: ShopOrderRecord };

function timestampMs(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

const orderStatusLabelKeys: Record<string, TranslationKey> = {
  CANCELLED: "reception.orders.statusCancelled",
  FAILED: "reception.orders.statusFailed",
  FULFILLED: "reception.orders.statusFulfilled",
  PAID: "reception.orders.statusPaid",
  PENDING_PAYMENT: "reception.orders.statusPendingPayment",
  READY_FOR_PICKUP: "shop.readyForPickup",
  REFUNDED: "reception.orders.statusRefunded",
};

function orderStatusLabel(status: string | null | undefined, t: ReturnType<typeof useT>) {
  const normalized = (status ?? "READY_FOR_PICKUP").toUpperCase();
  const labelKey = orderStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "READY_FOR_PICKUP");
}

export default function OwnerRevenueScreen() {
  const { palette } = useTheme();
  const t = useT();
  const dashboardQuery = useOwnerDashboard();
  const paymentsQuery = useOrgRecentPayments();
  const ordersQuery = useOrgActiveShopOrders();
  const refundPayment = useRefundPayment();

  function confirmRefund(payment: { id: string; amountPaise?: number; user?: { name?: string | null } | null }) {
    Alert.alert(
      t("owner.revenue.refundPaymentTitle"),
      t("owner.revenue.refundPaymentBody", {
        amount: formatInr(payment.amountPaise ?? 0),
        name: payment.user?.name ?? t("owner.revenue.thisMember"),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("owner.revenue.refund"),
          style: "destructive",
          onPress: () =>
            refundPayment.mutate({ paymentId: payment.id, reason: t("owner.revenue.refundedByGym") }),
        },
      ],
    );
  }
  const isLoading = dashboardQuery.isLoading || paymentsQuery.isLoading || ordersQuery.isLoading;
  const hasDashboardData = !isLoading && !dashboardQuery.isError;
  const payments = paymentsQuery.data?.payments ?? [];
  const orders = ordersQuery.data?.orders ?? [];
  const transactionFeed: TransactionFeedItem[] = [
    ...payments.map((payment) => ({
      id: payment.id,
      kind: "payment" as const,
      createdAt: payment.recordedAt ?? payment.createdAt,
      payment,
    })),
    ...orders.map((order) => ({
      id: order.id,
      kind: "order" as const,
      createdAt: order.createdAt,
      order,
    })),
  ].sort((left, right) => timestampMs(right.createdAt) - timestampMs(left.createdAt));

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
            title={t("owner.revenue.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
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
            </>
          ) : null}
          {!isLoading ? (
            <>
              <SectionHeader
                title={t("owner.revenue.recentTransactions")}
                action={<Pill tone={transactionFeed.length ? "blue" : "neutral"}>{transactionFeed.length}</Pill>}
              />
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
                {!dashboardQuery.isError && !paymentsQuery.isError && !ordersQuery.isError && transactionFeed.length
                  ? transactionFeed.map((item) => {
                      if (item.kind === "order") {
                        const { order } = item;
                        return (
                          <ListRow
                            key={item.id}
                            title={order.user?.name ?? t("owner.revenue.shopPickupOrder")}
                            subtitle={order.pickupCode ?? t("owner.revenue.pickupPending")}
                            leading={<IconBubble icon="bag-outline" tone={toneForShopOrderStatus(order.status)} />}
                            trailing={
                              <TransactionTrailing
                                amount={formatInr(order.totalPaise)}
                                status={orderStatusLabel(order.status, t)}
                                statusTone={toneForShopOrderStatus(order.status)}
                                time={formatDateTime(item.createdAt)}
                              />
                            }
                          />
                        );
                      }
                      const { payment } = item;
                      const refundable = (payment.status ?? "").toUpperCase() === "SUCCEEDED";
                      return (
                        <ListRow
                          key={item.id}
                          title={payment.user?.name ?? titleCaseFromCode(payment.purpose)}
                          subtitle={paymentModeLabel(payment.mode, t)}
                          leading={<IconBubble icon="card-outline" tone={toneForPaymentStatus(payment.status)} />}
                          trailing={
                            <View style={styles.rowTrailing}>
                              <TransactionTrailing
                                amount={formatInr(payment.amountPaise)}
                                status={paymentStatusLabel(payment.status, t)}
                                statusTone={toneForPaymentStatus(payment.status)}
                                time={formatDateTime(item.createdAt)}
                              />
                              {refundable ? (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={t("owner.revenue.refundAccessibility", {
                                    name: payment.user?.name ?? t("owner.revenue.paymentFallback"),
                                  })}
                                  hitSlop={8}
                                  onPress={() => confirmRefund(payment)}
                                  style={({ pressed }) => [
                                    styles.refundAction,
                                    {
                                      borderColor: palette.border.default,
                                      backgroundColor: palette.surface.default,
                                    },
                                    pressed ? styles.rowPressed : null,
                                  ]}
                                >
                                  <Ionicons
                                    name="return-up-back-outline"
                                    size={16}
                                    color={palette.text.secondary}
                                  />
                                </Pressable>
                              ) : null}
                            </View>
                          }
                        />
                      );
                    })
                  : null}
                {!dashboardQuery.isError && !paymentsQuery.isError && !ordersQuery.isError && !payments.length && !orders.length ? (
                  <EmptyState
                    icon="receipt-outline"
                    title={t("owner.revenue.noPaymentsYet")}
                    body={t("owner.revenue.noPaymentsYetBody")}
                  />
                ) : null}
              </Card>
            </>
          ) : null}
          {hasDashboardData ? <OwnerDashboardCharts charts={dashboardQuery.data?.charts} /> : null}
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

function TransactionTrailing({
  amount,
  status,
  statusTone,
  time,
}: {
  amount: string;
  status: string;
  statusTone: Parameters<typeof Pill>[0]["tone"];
  time: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.transactionTrailing}>
      <Text numberOfLines={1} style={[styles.rowAmount, { color: palette.text.primary }]}>
        {amount}
      </Text>
      <Pill tone={statusTone} style={styles.statusPill} textStyle={styles.statusPillText}>
        {status}
      </Pill>
      <Text numberOfLines={1} style={[styles.rowTime, { color: palette.text.tertiary }]}>
        {time}
      </Text>
    </View>
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
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.lg,
    paddingBottom: 96,
  },
  loadingCard: { gap: spacing.md },
  stack: { gap: spacing.md },
  rowTrailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  transactionTrailing: {
    alignItems: "flex-end",
    gap: 3,
    maxWidth: 118,
  },
  rowAmount: typography.bodyStrong,
  rowTime: {
    ...typography.caption,
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillText: {
    ...typography.caption,
  },
  refundAction: {
    alignItems: "center",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  rowPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
