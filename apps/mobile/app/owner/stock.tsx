import { Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import { BranchSelectorChip, EmptyState, Card, IconBubble, ListRow, MetricTile, QueryErrorState, ScreenHeader, SectionHeader, ZookScreen } from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { StockRow, type LowStockProduct } from "@/features/owner/components/stock-row";
import { titleCase } from "@/features/owner/helpers";
import { useOwnerDashboard } from "@/lib/domains/owner";
import { useOrgActiveShopOrders } from "@/lib/domains/shop";
import { formatInr } from "@/lib/formatting";
import { layout, typography, useTheme } from "@/lib/theme";

export default function OwnerStockScreen() {
  const { palette } = useTheme();
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
    const subject = encodeURIComponent(`Reorder ${product.name}`);
    const body = encodeURIComponent(
      `Hi,\n\nPlease share supplier options for ${product.name}.\n\nCurrent stock: ${product.stock ?? 0}\nThreshold: ${product.lowStockThreshold ?? 0}\n\nThanks.`,
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
            title="Stock"
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
          />
          <View style={styles.metricGrid}>
            <MetricTile label="Low stock" value={String(lowStock.length)} detail="Under threshold" tone="amber" style={styles.metricHalf} />
            <MetricTile label="Pickups" value={String(orders.length)} detail="Paid or ready" tone="lime" style={styles.metricHalf} />
          </View>
          <SectionHeader title="Products to reorder" subtitle="Below threshold" />
          <Card contentStyle={styles.stack}>
            {dashboardQuery.isError ? <QueryErrorState error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} /> : null}
            {!dashboardQuery.isError && lowStock.length
              ? lowStock.map((product) => <StockRow key={product.id} product={product} onReorder={() => void reorderProduct(product)} />)
              : null}
            {!dashboardQuery.isError && !lowStock.length ? <EmptyState title="All products in stock" body="No items below threshold." /> : null}
          </Card>
          <SectionHeader title="Orders ready for pickup" />
          <Card contentStyle={styles.stack}>
            {ordersQuery.isError ? <QueryErrorState error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} /> : null}
            {!ordersQuery.isError && orders.length
              ? orders.map((order) => (
                  <ListRow
                    key={order.id}
                    title={order.user?.name ?? "Member pickup"}
                    subtitle={`${order.pickupCode ?? "Pickup pending"} · ${titleCase(order.status)}`}
                    leading={<IconBubble icon="bag-check-outline" tone="lime" />}
                    trailing={
                      <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                        {formatInr(order.totalPaise)}
                      </Text>
                    }
                  />
                ))
              : null}
            {!ordersQuery.isError && !orders.length ? <EmptyState title="No pickups waiting" body="Paid shop orders will show up here until reception fulfills them." /> : null}
          </Card>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: { alignItems: "flex-start", gap: 6 },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: 14,
    paddingBottom: 96,
  },
  stack: { gap: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricHalf: { flexBasis: "47%", flexGrow: 1 },
  rowAmount: typography.bodyStrong,
});
