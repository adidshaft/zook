import { Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import { BranchSelectorChip, EmptyState, Card, IconBubble, ListRow, MetricTile, ProfileShortcut, QueryErrorState, ScreenHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { StockRow, type LowStockProduct } from "@/features/owner/components/stock-row";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatInr, titleCaseFromCode, toneForShopOrderStatus } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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
  const orders = ordersQuery.data?.orders ?? [];

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
                <BranchSelectorChip />
              </View>
            }
            trailing={<ProfileShortcut />}
          />
          <View style={styles.metricGrid}>
            <MetricTile label={t("owner.stock.lowStock")} value={String(lowStock.length)} detail={t("owner.stock.underThreshold")} tone="amber" style={styles.metricHalf} />
            <MetricTile label={t("owner.stock.pickups")} value={String(orders.length)} detail={t("owner.stock.paidOrders")} tone="blue" style={styles.metricHalf} />
          </View>
          <SectionHeader title={t("owner.stock.productsToReorder")} />
          <Card contentStyle={styles.stack}>
            {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
            {!dashboardQuery.isError && lowStock.length
              ? lowStock.map((product) => <StockRow key={product.id} product={product} onReorder={() => void reorderProduct(product)} />)
              : null}
            {!dashboardQuery.isError && !lowStock.length ? <EmptyState icon="cube-outline" title={t("owner.stock.allInStock")} body={t("owner.stock.allInStockBody")} /> : null}
          </Card>
          <SectionHeader title={t("owner.stock.pickupOrders")} />
          <Card contentStyle={styles.stack}>
            {ordersQuery.isError ? <QueryErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} /> : null}
            {!ordersQuery.isError && orders.length
              ? orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title={order.user?.name ?? t("owner.stock.memberPickup")}
                    subtitle={`${order.pickupCode ?? t("owner.stock.pickupPending")} · ${titleCaseFromCode(order.status)}`}
                    leading={<IconBubble icon="bag-check-outline" tone={toneForShopOrderStatus(order.status)} />}
                    trailing={
                      <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                        {formatInr(order.totalPaise)}
                      </Text>
                    }
                  />
                ))
              : null}
            {!ordersQuery.isError && !orders.length ? <EmptyState icon="bag-handle-outline" title={t("owner.stock.noPickups")} body={t("owner.stock.noPickupsBody")} /> : null}
          </Card>
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
  stack: { gap: spacing.md },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricHalf: { flexBasis: "47%", flexGrow: 1 },
  rowAmount: typography.bodyStrong,
});
