import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { useMyShopOrders, useShopProducts } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Shop() {
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const latestOrder = ordersQuery.data?.orders?.[0] as { pickupCode?: string; status?: string } | undefined;
  const products = (productsQuery.data?.products ?? []) as Array<{ id: string; name: string; pricePaise: number; stock: number }>;

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
              <PrimaryButton>Buy</PrimaryButton>
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
