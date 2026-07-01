import { Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import { BranchSelectorChip, EmptyState, Card, HeaderActions, IconBubble, Pill, QueryErrorState, ScreenHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { StockRow, type LowStockProduct } from "@/features/owner/components/stock-row";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatInr, toneForShopOrderStatus } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function orderWorkPriority(order: { status?: string | null; pickupCode?: string | null; fulfilledAt?: string | null }) {
  const status = String(order.status ?? "").toUpperCase();
  if (status === "PENDING_PAYMENT") return 0;
  if (status === "READY_FOR_PICKUP" || (order.pickupCode && !order.fulfilledAt)) return 1;
  if (status === "PROCESSING" || status === "PAID") return 2;
  return 3;
}

function pickupOrderStatusLabel(
  order: { status?: string | null; pickupCode?: string | null; fulfilledAt?: string | null },
  t: ReturnType<typeof useI18n>["t"],
) {
  const status = String(order.status ?? "").toUpperCase();
  if (status === "PENDING_PAYMENT") return t("shop.orderNeedsPayment");
  if (status === "READY_FOR_PICKUP" || (order.pickupCode && !order.fulfilledAt)) {
    return order.pickupCode ? t("shop.orderReadyWithCode", { code: order.pickupCode }) : t("shop.orderReady");
  }
  if (status === "PROCESSING" || status === "PAID") return t("shop.orderBeingPrepared");
  if (status === "CANCELLED") return t("shop.orderCancelled");
  return t("owner.stock.pickupPending");
}

export default function OwnerStockScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const dashboardQuery = useOwnerDashboard();
  const ordersQuery = useOrgActiveShopOrders();
  // Only items at or below their reorder threshold belong in the "Below
  // threshold" list — guard client-side so the list and the count stay honest
  // even if the payload includes well-stocked products.
  const lowStock = (dashboardQuery.data?.products ?? []).filter(
    (product) => (product.stock ?? 0) <= (product.lowStockThreshold ?? 0),
  );
  const orders = [...(ordersQuery.data?.orders ?? [])].sort(
    (left, right) => orderWorkPriority(left) - orderWorkPriority(right),
  );

  async function reorderProduct(product: LowStockProduct) {
    const subject = encodeURIComponent(t("owner.stock.reorderSubject", { name: product.name }));
    const body = encodeURIComponent(
      t("owner.stock.reorderBody", {
        name: product.name,
        stock: product.stock ?? 0,
        threshold: product.lowStockThreshold ?? 0,
      }),
    );
    await Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <>
      <ZookScreen testID="owner-stock-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={dashboardQuery.isRefetching || ordersQuery.isRefetching}
                onRefresh={() => { void dashboardQuery.refetch(); void ordersQuery.refetch(); }}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <ScreenHeader
            title={t("owner.stock.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />
          <SectionHeader
            title={t("owner.stock.pickupOrders")}
            action={<Pill tone={orders.length ? "blue" : "neutral"}>{orders.length}</Pill>}
          />
          <Card contentStyle={styles.stack}>
            {ordersQuery.isError ? <QueryErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} /> : null}
            {!ordersQuery.isError && orders.length
                ? orders.map((order) => (
                  <PickupOrderRow
                    key={order.id}
                    name={order.user?.name ?? t("owner.stock.memberPickup")}
                    amount={formatInr(order.totalPaise)}
                    status={pickupOrderStatusLabel(order, t)}
                    statusTone={toneForShopOrderStatus(order.status)}
                  />
                ))
              : null}
            {!ordersQuery.isError && !orders.length ? <EmptyState icon="bag-handle-outline" title={t("owner.stock.noPickups")} body={t("owner.stock.noPickupsBody")} /> : null}
          </Card>
          <SectionHeader
            title={t("owner.stock.productsToReorder")}
            action={<Pill tone={lowStock.length ? "amber" : "neutral"}>{lowStock.length}</Pill>}
          />
          <Card contentStyle={styles.stack}>
            {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
            {!dashboardQuery.isError && lowStock.length
              ? lowStock.map((product) => <StockRow key={product.id} product={product} onReorder={() => void reorderProduct(product)} />)
              : null}
            {!dashboardQuery.isError && !lowStock.length ? <EmptyState icon="cube-outline" title={t("owner.stock.allInStock")} body={t("owner.stock.allInStockBody")} /> : null}
          </Card>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

function PickupOrderRow({
  name,
  amount,
  status,
  statusTone,
}: {
  name: string;
  amount: string;
  status: string;
  statusTone: Parameters<typeof Pill>[0]["tone"];
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.pickupRow,
        {
          borderColor: palette.border.subtle,
          backgroundColor: palette.surface.default,
        },
      ]}
    >
      <IconBubble icon="bag-check-outline" tone={statusTone} size={34} />
      <View style={styles.pickupCopy}>
        <View style={styles.pickupTitleLine}>
          <Text numberOfLines={1} style={[styles.pickupName, { color: palette.text.primary }]}>
            {name}
          </Text>
          <Text numberOfLines={1} style={[styles.rowAmount, { color: palette.text.primary }]}>
            {amount}
          </Text>
        </View>
        <View style={styles.pickupMetaLine}>
          <Pill tone={statusTone} style={styles.statusPill} textStyle={styles.statusPillText}>
            {status}
          </Pill>
        </View>
      </View>
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
  stack: { gap: 8 },
  pickupRow: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  pickupCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  pickupTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  pickupName: {
    ...typography.bodyStrong,
    flex: 1,
    minWidth: 0,
  },
  pickupMetaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  rowAmount: typography.bodyStrong,
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillText: typography.caption,
});
