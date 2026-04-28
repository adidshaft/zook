import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  ProductCard,
  SearchBar,
  SecondaryButton,
  SegmentedControl,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT";
type CheckoutState = "browse" | "cart" | "checkout" | "pickup";
type Order = Awaited<ReturnType<typeof zookMockServices.shopService.createOrder>>;

const categories: Array<{ label: string; value: Category }> = [
  { label: "All", value: "ALL" },
  { label: "Water", value: "WATER" },
  { label: "Protein", value: "PROTEIN_SHAKE" },
  { label: "Shaker", value: "SHAKER" },
  { label: "Towel", value: "TOWEL" },
  { label: "Other", value: "SUPPLEMENT" },
];

const products = zookDemoFixtures.shopProducts;

function iconForCategory(category: Category) {
  if (category === "WATER") return "water-outline" as const;
  if (category === "TOWEL") return "shirt-outline" as const;
  if (category === "SHAKER") return "flask-outline" as const;
  return "nutrition-outline" as const;
}

export default function Shop() {
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({
    "shop-protein-shake": 1,
    "shop-shaker": 1,
  });
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
      <ShopShell selectedPath="/shop">
        <MobileHeader title="Ready for pickup" subtitle="Show this code at the front desk." />
        <GlassCard variant="success" contentStyle={styles.pickupContent}>
          <Text style={styles.pickupLabel}>Pickup code</Text>
          <Text style={styles.pickupCode}>{order.pickupCode}</Text>
          <StatusChip status={order.status.replace(/_/g, " ")} tone="lime" />
        </GlassCard>
        <GlassCard variant="compact" contentStyle={styles.stack}>
          {order.items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            return (
              <ListRow
                key={item.productId}
                title={product?.name ?? item.productId}
                subtitle={`${item.quantity} item · ${formatInr(item.unitPaise)}`}
                trailing={<StatusChip status="Paid" tone="neutral" />}
              />
            );
          })}
        </GlassCard>
        <ZookButton onPress={() => setCheckoutState("browse")} icon="bag-outline">Back to Shop</ZookButton>
      </ShopShell>
    );
  }

  if (checkoutState === "checkout" && order) {
    return (
      <ShopShell selectedPath="/shop">
        <MobileHeader title="Payment" subtitle="Pickup order for Iron Temple Gym." />
        <GlassCard contentStyle={styles.checkoutContent}>
          <ListRow title="Hosted checkout" subtitle="Provider handoff" trailing={<StatusChip status="Step 1" tone="neutral" />} />
          <ListRow title="Backend confirms payment" subtitle="Client redirect is never trusted" trailing={<StatusChip status="Step 2" tone="amber" />} />
          <ListRow title="Pickup code issued" subtitle="Reception verifies before fulfillment" trailing={<StatusChip status="Step 3" tone="lime" />} />
          <View style={styles.checkoutTotal}>
            <Text style={styles.cardBody}>Order total</Text>
            <Text style={styles.totalText}>{formatInr(order.totalPaise)}</Text>
          </View>
          <ZookButton onPress={() => void confirmMockPayment()} icon="card-outline">Continue to payment</ZookButton>
        </GlassCard>
      </ShopShell>
    );
  }

  if (checkoutState === "cart") {
    return (
      <ShopShell selectedPath="/shop">
        <MobileHeader
          eyebrow="Cart"
          title="Review order"
          subtitle="Reception fulfills pickup after payment confirmation."
          chip={<StatusChip status={`${itemCount} items`} tone="lime" />}
        />
        <GlassCard variant="compact" contentStyle={styles.stack}>
          {cartItems.length ? (
            cartItems.map((item) => (
              <ListRow
                key={item.product.id}
                title={item.product.name}
                subtitle={`${item.quantity} item · ${item.product.fulfillmentLabel}`}
                trailing={<StatusChip status={formatInr(item.product.pricePaise * item.quantity)} tone="neutral" />}
              />
            ))
          ) : (
            <EmptyState title="Your cart is empty" body="Add desk pickup items from the shop." />
          )}
        </GlassCard>
        <GlassCard variant="compact" contentStyle={styles.totalRow}>
          <Text style={styles.cardBody}>Subtotal</Text>
          <Text style={styles.totalText}>{formatInr(totalPaise)}</Text>
        </GlassCard>
        <View style={styles.actionRow}>
          <SecondaryButton onPress={() => setCheckoutState("browse")} style={styles.actionHalf}>Back</SecondaryButton>
          <ZookButton onPress={() => void createMockCheckout()} disabled={!cartItems.length} style={styles.actionHalf}>
            Continue
          </ZookButton>
        </View>
      </ShopShell>
    );
  }

  return (
    <>
      <ShopShell selectedPath="/shop">
        <MobileHeader
          eyebrow="Shop"
          title="Desk pickup"
          subtitle="Order gym essentials for counter pickup at Iron Temple Gym."
          trailing={
            <Pressable
              onPress={() => setCheckoutState("cart")}
              accessibilityRole="button"
              accessibilityLabel="Open cart"
              style={styles.cartIcon}
            >
              <Ionicons name="bag-outline" size={22} color={colors.text} />
              {itemCount ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount}</Text></View> : null}
            </Pressable>
          }
        />

        <SearchBar value={query} onChangeText={setQuery} placeholder="Search water, protein, towel..." />
        <SegmentedControl options={categories} value={category} onChange={setCategory} />

        {filteredProducts.length ? (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const lowStock = product.stock <= product.lowStockThreshold;
              return (
                <ProductCard
                  key={product.id}
                  name={product.name}
                  price={formatInr(product.pricePaise)}
                  stock={lowStock ? "Low stock" : product.fulfillmentLabel}
                  tone={lowStock ? "amber" : "lime"}
                  icon={iconForCategory(product.category as Category)}
                  onPress={() => addToCart(product.id)}
                  style={styles.productCard}
                />
              );
            })}
          </View>
        ) : (
          <EmptyState title="No products found" body="Try a different item or ask the desk for availability." />
        )}
      </ShopShell>
      {itemCount ? (
        <Pressable
          onPress={() => setCheckoutState("cart")}
          style={styles.miniCart}
          accessibilityRole="button"
          accessibilityLabel="Open mini cart"
        >
          <Text style={styles.miniCartText}>{itemCount} items · {formatInr(totalPaise)}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.bg} />
        </Pressable>
      ) : null}
    </>
  );
}

function ShopShell({ children, selectedPath }: { children: React.ReactNode; selectedPath: string }) {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {children}
        </ScrollView>
        <BottomNav selectedPath={selectedPath} />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: 132,
  },
  cartIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
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
    ...typography.navLabel,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productCard: {
    flexBasis: "47%",
    flexGrow: 1,
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
    ...{
      shadowColor: colors.lime,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
  },
  miniCartText: {
    color: colors.bg,
    ...typography.button,
  },
  stack: {
    gap: 10,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalText: {
    color: colors.text,
    ...typography.metric,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  checkoutContent: {
    gap: 10,
  },
  checkoutTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 4,
  },
  pickupContent: {
    alignItems: "center",
    gap: 10,
  },
  pickupLabel: {
    color: colors.muted,
    ...typography.eyebrow,
  },
  pickupCode: {
    color: colors.text,
    fontSize: 44,
    lineHeight: 50,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
});
