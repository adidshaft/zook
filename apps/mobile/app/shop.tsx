import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  ActiveGymPill,
  Card,
  Dock,
  IconBubble,
  ListRow,
  Pill,
  PrimaryButton,
  Screen,
  SearchField,
  SecondaryButton,
  SegmentedControl,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import { colors } from "@/lib/theme";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT";
type CheckoutState = "browse" | "cart" | "checkout" | "pickup";
type Order = Awaited<ReturnType<typeof zookMockServices.shopService.createOrder>>;

const categories: Array<{ label: string; value: Category }> = [
  { label: "All", value: "ALL" },
  { label: "Water", value: "WATER" },
  { label: "Protein", value: "PROTEIN_SHAKE" },
  { label: "Shaker", value: "SHAKER" },
  { label: "Towel", value: "TOWEL" },
  { label: "Supplement", value: "SUPPLEMENT" },
];

const products = zookDemoFixtures.shopProducts;

export default function Shop() {
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("browse");
  const [order, setOrder] = useState<Order | null>(zookDemoFixtures.shopOrders[0] ?? null);
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "ALL" || product.category === category;
      const queryMatch = !query || product.name.toLowerCase().includes(query.toLowerCase());
      return categoryMatch && queryMatch;
    });
  }, [category, query]);
  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((candidate) => candidate.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const totalPaise = cartItems.reduce((sum, item) => sum + item.product.pricePaise * item.quantity, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(productId: string) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  async function createMockCheckout() {
    const nextOrder = await zookMockServices.shopService.createOrder(
      cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    );
    setOrder(nextOrder);
    setCheckoutState("checkout");
  }

  async function confirmMockPayment() {
    if (!order) return;
    const session = await zookMockServices.shopService.createCheckoutSession(order.id);
    const paidOrder = await zookMockServices.shopService.confirmMockOrderPayment(session.id);
    setOrder(paidOrder);
    setCheckoutState("pickup");
  }

  if (checkoutState === "pickup" && order) {
    return (
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>Ready for pickup</Text>
            <Text style={styles.subtitle}>Show this code at the front desk. Priya can verify and fulfill the order.</Text>
          </View>
          <Card style={styles.pickupCard}>
            <Text style={styles.pickupLabel}>Pickup code</Text>
            <Text style={styles.pickupCode}>{order.pickupCode}</Text>
            <Pill tone="lime">{order.status.replace(/_/g, " ")}</Pill>
          </Card>
          <Card style={styles.stack}>
            {order.items.map((item) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              return (
                <ListRow
                  key={item.productId}
                  title={product?.name ?? item.productId}
                  subtitle={`${item.quantity} item · ${formatInr(item.unitPaise)}`}
                  trailing={<Pill tone="neutral">Paid</Pill>}
                />
              );
            })}
          </Card>
          <PrimaryButton onPress={() => setCheckoutState("browse")}>Back to Shop</PrimaryButton>
        </ScrollView>
        <Dock />
      </Screen>
    );
  }

  if (checkoutState === "checkout" && order) {
    return (
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>Hosted checkout</Text>
            <Text style={styles.subtitle}>The order activates only after mock backend payment confirmation.</Text>
          </View>
          <Card style={styles.checkoutCard}>
            <ListRow title="Secure hosted checkout" subtitle="Mock provider handoff" trailing={<Pill tone="blue">Step 1</Pill>} />
            <ListRow title="Backend confirms payment" subtitle="Client redirect is never trusted" trailing={<Pill tone="amber">Step 2</Pill>} />
            <ListRow title="Pickup code issued" subtitle="Reception verifies before fulfillment" trailing={<Pill tone="lime">Step 3</Pill>} />
            <View style={styles.checkoutTotal}>
              <Text style={styles.cardBody}>Order total</Text>
              <Text style={styles.totalText}>{formatInr(order.totalPaise)}</Text>
            </View>
            <PrimaryButton onPress={() => void confirmMockPayment()}>Confirm Mock Payment</PrimaryButton>
          </Card>
        </ScrollView>
        <Dock />
      </Screen>
    );
  }

  if (checkoutState === "cart") {
    return (
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Cart</Text>
              <Text style={styles.title}>Review order</Text>
              <Text style={styles.subtitle}>Pickup items are fulfilled by reception after payment confirmation.</Text>
            </View>
            <Pill tone="lime">{itemCount} items</Pill>
          </View>
          <Card style={styles.stack}>
            {cartItems.length ? (
              cartItems.map((item) => (
                <ListRow
                  key={item.product.id}
                  title={item.product.name}
                  subtitle={`${item.quantity} item · ${item.product.fulfillmentLabel}`}
                  trailing={<Pill tone="neutral">{formatInr(item.product.pricePaise * item.quantity)}</Pill>}
                />
              ))
            ) : (
              <Text style={styles.cardBody}>Your cart is empty.</Text>
            )}
          </Card>
          <Card style={styles.totalCard}>
            <Text style={styles.cardBody}>Subtotal</Text>
            <Text style={styles.totalText}>{formatInr(totalPaise)}</Text>
          </Card>
          <View style={styles.actionRow}>
            <SecondaryButton onPress={() => setCheckoutState("browse")} style={styles.actionHalf}>
              Back
            </SecondaryButton>
            <PrimaryButton onPress={() => void createMockCheckout()} disabled={!cartItems.length} style={styles.actionHalf}>
              Continue
            </PrimaryButton>
          </View>
        </ScrollView>
        <Dock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Shop</Text>
            <Text style={styles.title}>Desk pickup</Text>
            <Text style={styles.subtitle}>Order water, protein, towels, and gear for counter pickup.</Text>
          </View>
          <Pressable onPress={() => setCheckoutState("cart")} accessibilityRole="button" accessibilityLabel="Open cart" style={styles.cartIcon}>
            <Ionicons name="bag-outline" size={24} color={colors.text} />
            {itemCount ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View> : null}
          </Pressable>
        </View>

        <SearchField value={query} onChangeText={setQuery} placeholder="Search water, protein, towel..." />
        <SegmentedControl options={categories} value={category} onChange={setCategory} />

        <View style={styles.productGrid}>
          {filteredProducts.map((product) => {
            const lowStock = product.stock <= product.lowStockThreshold;
            return (
              <Card key={product.id} style={styles.productCard}>
                <View style={styles.productTop}>
                  <IconBubble
                    icon={product.category === "WATER" ? "water-outline" : product.category === "TOWEL" ? "shirt-outline" : "nutrition-outline"}
                    tone={lowStock ? "amber" : "lime"}
                  />
                  <Pill tone={lowStock ? "amber" : "lime"}>{product.fulfillmentLabel}</Pill>
                </View>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.price}>{formatInr(product.pricePaise)}</Text>
                <Text style={styles.stockText}>{product.stock} in stock</Text>
                <PrimaryButton onPress={() => addToCart(product.id)}>Add</PrimaryButton>
              </Card>
            );
          })}
        </View>
      </ScrollView>
      {itemCount ? (
        <Pressable onPress={() => setCheckoutState("cart")} style={styles.miniCart} accessibilityRole="button" accessibilityLabel="Open mini cart">
          <Text style={styles.miniCartText}>{itemCount} items · {formatInr(totalPaise)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.bg} />
        </Pressable>
      ) : null}
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 130,
  },
  header: {
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  cartIcon: {
    width: 52,
    height: 52,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: colors.bg,
    fontSize: 11,
    fontWeight: "900",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 10,
    minHeight: 226,
  },
  productTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  productName: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  price: {
    color: colors.lime,
    fontSize: 22,
    fontWeight: "900",
  },
  stockText: {
    color: colors.muted,
    lineHeight: 20,
  },
  miniCart: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 104,
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: colors.lime,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniCartText: {
    color: colors.bg,
    fontSize: 16,
    fontWeight: "900",
  },
  stack: {
    gap: 12,
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  totalText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
  checkoutCard: {
    gap: 12,
  },
  checkoutTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 4,
  },
  pickupCard: {
    alignItems: "center",
    gap: 10,
    borderColor: colors.limeBorder,
    backgroundColor: colors.accentPanel,
  },
  pickupLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  pickupCode: {
    color: colors.text,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: "900",
  },
});
