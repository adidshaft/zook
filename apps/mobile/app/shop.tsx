import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMyShopOrders, useShopProducts } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Shop() {
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const latestOrder = ordersQuery.data?.orders?.[0] as { pickupCode?: string; status?: string } | undefined;
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
        <Card>
          <Pill tone="lime">Pay online · pickup at gym</Pill>
          <Text style={styles.title} selectable>
            {latestOrder?.pickupCode ? `Pickup code: ${latestOrder.pickupCode}` : "No pickup waiting"}
          </Text>
          <Text style={styles.body} selectable>
            Mock checkout confirms the order before stock moves.
          </Text>
        </Card>
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
  title: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 8 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }
});
