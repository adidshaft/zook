import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Card, Pill, PrimaryButton, Screen, Skeleton } from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatInr } from "@/lib/formatting";
import { useMyShopOrders, useShopProducts } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Shop() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const routeParams = useLocalSearchParams<{ focus?: string; notificationId?: string; orderId?: string }>();
  const { activeOrgId, token } = useAuth();
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["shop", "products", activeOrgId] })
    ]);
    setRefreshing(false);
  };

  return (
    <Screen title="Shop">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        {routeParams.focus === "shop-order" ? (
          <Card style={styles.calloutCard}>
            <Pill tone="blue">Opened from order notification</Pill>
            <Text style={styles.calloutTitle}>
              Shop order context is active.
            </Text>
            <Text style={styles.body}>
              {routeParams.orderId
                ? "Your order details are below."
                : "View your recent orders."}
            </Text>
          </Card>
        ) : null}
        <Card>
          <Pill tone="lime">Pay online · pickup at gym</Pill>
          <Text style={styles.title}>
            {latestOrder?.pickupCode ? `Pickup code: ${latestOrder.pickupCode}` : "No pickup waiting"}
          </Text>
          <Text style={styles.body}>
            Show your pickup code at the gym counter.
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
                    <Text style={styles.orderTitle}>
                      {order.pickupCode ? `Pickup ${order.pickupCode}` : "Order pending"}
                    </Text>
                    <Text style={styles.body}>
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
          <>
            <Card>
              <View style={styles.row}>
                <Skeleton width={48} height={48} borderRadius={8} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="60%" height={20} />
                  <Skeleton width="40%" height={16} />
                </View>
                <Skeleton width={80} height={40} borderRadius={20} />
              </View>
            </Card>
            <Card>
              <View style={styles.row}>
                <Skeleton width={48} height={48} borderRadius={8} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="50%" height={20} />
                  <Skeleton width="30%" height={16} />
                </View>
                <Skeleton width={80} height={40} borderRadius={20} />
              </View>
            </Card>
          </>
        ) : null}
        {products.map((product) => (
          <Card key={product.id} style={{ padding: 12 }}>
            <View style={styles.row}>
              <Image
                source={{ uri: "https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=400&h=400&fit=crop" }}
                style={styles.productThumbnail}
                contentFit="cover"
              />
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={styles.title}>
                  {product.name}
                </Text>
                <Text style={styles.body}>
                  {formatInr(product.pricePaise)} · {product.stock} left
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
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productThumbnail: { width: 64, height: 64, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  orderList: { gap: 12 },
  orderCopy: { flex: 1 },
  orderTitle: { color: colors.text, fontSize: 17, fontWeight: "800" },
  cardHighlighted: {
    borderColor: "rgba(96,165,250,0.4)",
    backgroundColor: "rgba(96,165,250,0.07)"
  }
});
