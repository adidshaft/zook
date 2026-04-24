import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMyShopOrders, useShopProducts } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Shop() {
  const routeParams = useLocalSearchParams<{ focus?: string; notificationId?: string; orderId?: string }>();
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const orders = (ordersQuery.data?.orders ?? []) as Array<{
    id: string;
    pickupCode?: string | null;
    status?: string | null;
    createdAt?: string | null;
  }>;
  const latestOrder = orders[0];
  const products = (productsQuery.data?.products ?? []) as Array<{ id: string; name: string; pricePaise: number; stock: number }>;

  async function buyProduct(productId: string) {
    if (!token || !activeOrgId) {
      return;
    }
    try {
      setBusyId(productId);
      const payload = await mobileApiFetch<{ checkoutUrl: string }>("/shop/orders", {
        method: "POST",
        token,
        body: {
          orgId: activeOrgId,
          items: [{ productId, quantity: 1 }]
        }
      });
      await Linking.openURL(toWebUrl(payload.checkoutUrl));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products", activeOrgId] })
      ]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen title="Shop">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {routeParams.focus === "shop-order" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Opened from order notification</Pill>
            <Text style={styles.calloutTitle} selectable>
              Shop order context is active.
            </Text>
            <Text style={styles.body} selectable>
              {routeParams.orderId
                ? `Order ${routeParams.orderId} was carried through the notification payload.`
                : "The shop screen is acting as the safest pickup fallback for this push notification."}
            </Text>
          </Card>
        ) : null}
        <Card>
          <Pill tone="lime">Pay online · pickup at gym</Pill>
          <Text style={styles.title} selectable>
            {latestOrder?.pickupCode ? `Pickup code: ${latestOrder.pickupCode}` : "No pickup waiting"}
          </Text>
          <Text style={styles.body} selectable>
            Mock checkout confirms the order before stock moves.
          </Text>
        </Card>
        {orders.length ? (
          <View style={styles.orderList}>
            {orders.slice(0, 3).map((order) => (
              <Card
                key={order.id}
                style={order.id === routeParams.orderId ? styles.cardHighlighted : undefined}
              >
                <View style={styles.row}>
                  <View style={styles.orderCopy}>
                    <Text style={styles.orderTitle} selectable>
                      {order.pickupCode ? `Pickup ${order.pickupCode}` : "Order pending"}
                    </Text>
                    <Text style={styles.body} selectable>
                      {order.status ?? "Pending"}
                    </Text>
                  </View>
                  <Pill tone={order.id === routeParams.orderId ? "blue" : "neutral"}>
                    {order.id === routeParams.orderId ? "From push" : "Recent"}
                  </Pill>
                </View>
              </Card>
            ))}
          </View>
        ) : null}
        {productsQuery.isLoading ? (
          <Card>
            <Text style={styles.body}>Loading products...</Text>
          </Card>
        ) : null}
        {products.map((product) => (
          <Card key={product.id}>
            <View style={styles.row}>
              <View>
                <Text style={styles.title} selectable>
                  {product.name}
                </Text>
                <Text style={styles.body} selectable>
                  ₹{Math.round(product.pricePaise / 100)} · {product.stock} left
                </Text>
              </View>
              <PrimaryButton onPress={() => void buyProduct(product.id)}>
                {busyId === product.id ? "Opening..." : "Buy"}
              </PrimaryButton>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  calloutCard: { gap: 10 },
  calloutTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  orderList: { gap: 12 },
  orderCopy: { flex: 1 },
  orderTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  cardHighlighted: {
    borderColor: "rgba(96,165,250,0.4)",
    backgroundColor: "rgba(96,165,250,0.07)"
  }
});
