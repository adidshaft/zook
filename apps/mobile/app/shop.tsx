import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  ListRow,
  MobileHeader,
  ProductCard,
  SearchBar,
  SecondaryButton,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import {
  useCompleteMockPayment,
  useCreateShopOrder,
  useMyShopOrders,
  useShopProducts,
  type ShopOrderRecord,
} from "@/lib/query-hooks";
import { useAuth } from "@/lib/auth";
import { toWebUrl } from "@/lib/api";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT" | "OTHER";
type CheckoutState = "browse" | "cart" | "checkout" | "pickup";

const categories: Array<{ label: string; value: Category }> = [
  { label: "All", value: "ALL" },
  { label: "Water", value: "WATER" },
  { label: "Shake", value: "PROTEIN_SHAKE" },
  { label: "Cup", value: "SHAKER" },
  { label: "Towel", value: "TOWEL" },
  { label: "Other", value: "SUPPLEMENT" },
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function iconForCategory(category: Category) {
  if (category === "WATER") return "water-outline" as const;
  if (category === "TOWEL") return "shirt-outline" as const;
  if (category === "SHAKER") return "flask-outline" as const;
  return "nutrition-outline" as const;
}

function checkoutUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : toWebUrl(url);
}

export default function Shop() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    focus?: string | string[];
  }>();
  const { session } = useAuth();
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("browse");
  const [order, setOrder] = useState<ShopOrderRecord | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<{
    id: string;
    provider?: string;
    checkoutUrl?: string;
  } | null>(null);
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const createOrder = useCreateShopOrder();
  const completeMockPayment = useCompleteMockPayment();
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const activeOrganization = session?.activeOrganization ?? session?.organizations[0] ?? null;
  const products = productsQuery.data?.products ?? [];
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "ALL" || product.category === category;
      const queryMatch = !query || product.name.toLowerCase().includes(query.toLowerCase());
      return categoryMatch && queryMatch;
    });
  }, [category, products, query]);
  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((candidate) => candidate.id === productId);
      return product ? { product, quantity } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const totalPaise = cartItems.reduce(
    (sum, item) => sum + item.product.pricePaise * item.quantity,
    0,
  );
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const requestedOrderId = firstParam(params.orderId);
    if (!requestedOrderId) {
      return;
    }
    const matchedOrder = ordersQuery.data?.orders.find(
      (candidate) => candidate.id === requestedOrderId,
    );
    if (matchedOrder) {
      setOrder(matchedOrder);
      setCheckoutState("pickup");
    }
  }, [ordersQuery.data?.orders, params.orderId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (nextState !== "active" || !wasAway || !refreshAfterCheckoutRef.current || !order) {
        return;
      }
      refreshAfterCheckoutRef.current = false;
      void ordersQuery.refetch().then((refreshed) => {
        const refreshedOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
        if (refreshedOrder && refreshedOrder.status !== "PENDING_PAYMENT") {
          setOrder(refreshedOrder);
          setCart({});
          setCheckoutState("pickup");
          void Promise.all([
            queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
            queryClient.invalidateQueries({ queryKey: ["org"] }),
          ]);
        }
      });
    });
    return () => subscription.remove();
  }, [order, ordersQuery, queryClient]);

  function addToCart(productId: string) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product || product.stock <= (cart[productId] ?? 0)) {
      return;
    }
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  function removeFromCart(productId: string) {
    setCart((current) => {
      const quantity = current[productId] ?? 0;
      if (quantity <= 1) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: quantity - 1 };
    });
  }

  async function createCheckout() {
    const result = await createOrder.mutateAsync({
      items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
    });
    setOrder({
      ...result.order,
      items: cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPaise: item.product.pricePaise,
        product: item.product,
      })),
    });
    setCheckoutSession({
      id: result.session.id,
      provider: result.session.provider,
      ...(result.checkoutUrl ? { checkoutUrl: result.checkoutUrl } : {}),
    });
    setCheckoutState("checkout");
  }

  async function continuePayment() {
    if (!order || !checkoutSession) return;
    if (
      checkoutSession.provider &&
      checkoutSession.provider !== "mock" &&
      checkoutSession.checkoutUrl
    ) {
      refreshAfterCheckoutRef.current = true;
      await Linking.openURL(checkoutUrl(checkoutSession.checkoutUrl));
      return;
    }
    await completeMockPayment.mutateAsync(checkoutSession.id);
    const refreshed = await ordersQuery.refetch();
    const paidOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
    setOrder(paidOrder ?? { ...order, status: "READY_FOR_PICKUP" });
    setCart({});
    setCheckoutState("pickup");
  }

  if (checkoutState === "pickup" && order) {
    return (
      <ShopShell selectedPath="/shop">
        <MobileHeader
          title="Ready for pickup"
          subtitle="Show this code at the front desk."
          showProfileShortcut={false}
        />
        <GlassCard variant="success" contentStyle={styles.pickupContent}>
          <Text style={styles.pickupLabel}>Pickup code</Text>
          <Text style={styles.pickupCode}>{order.pickupCode ?? "Pending"}</Text>
          <StatusChip status={order.status.replace(/_/g, " ")} tone="lime" />
        </GlassCard>
        <GlassCard variant="compact" contentStyle={styles.stack}>
          {(order.items.length
            ? order.items
            : cartItems.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitPaise: item.product.pricePaise,
                product: item.product,
              }))
          ).map((item) => {
            const product =
              item.product ?? products.find((candidate) => candidate.id === item.productId);
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
        <ZookButton
          onPress={() => {
            setOrder(null);
            setCheckoutState("browse");
            router.replace("/shop" as never);
          }}
          icon="bag-outline"
        >
          Back to Shop
        </ZookButton>
      </ShopShell>
    );
  }

  if (checkoutState === "checkout" && order) {
    return (
      <ShopShell selectedPath="/shop">
        <MobileHeader
          title="Payment"
          subtitle="Your item will be ready at the desk."
          showProfileShortcut={false}
        />
        <GlassCard contentStyle={styles.checkoutContent}>
          <ListRow
            title="Pay securely"
            subtitle="Confirm the order"
            trailing={<StatusChip status="1" tone="neutral" />}
          />
          <ListRow
            title="Get pickup code"
            subtitle="We will make a code for the desk"
            trailing={<StatusChip status="2" tone="amber" />}
          />
          <ListRow
            title="Collect at desk"
            subtitle="Show the code to pick it up"
            trailing={<StatusChip status="3" tone="lime" />}
          />
          <View style={styles.checkoutTotal}>
            <Text style={styles.cardBody}>Order total</Text>
            <Text style={styles.totalText}>{formatInr(order.totalPaise)}</Text>
          </View>
          <ZookButton
            onPress={() => void continuePayment()}
            disabled={completeMockPayment.isPending}
            icon="card-outline"
          >
            {completeMockPayment.isPending ? "Confirming..." : "Continue"}
          </ZookButton>
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
          subtitle="Pick it up at the front desk after payment."
          chip={<StatusChip status={`${itemCount} items`} tone="lime" />}
          showProfileShortcut={false}
        />
        <GlassCard variant="compact" contentStyle={styles.stack}>
          {cartItems.length ? (
            cartItems.map((item) => (
              <ListRow
                key={item.product.id}
                title={item.product.name}
                subtitle={`${item.quantity} item · ${item.product.stock} in stock`}
                trailing={
                  <StatusChip
                    status={formatInr(item.product.pricePaise * item.quantity)}
                    tone="neutral"
                  />
                }
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
          <SecondaryButton onPress={() => setCheckoutState("browse")} style={styles.actionHalf}>
            Back
          </SecondaryButton>
          <ZookButton
            onPress={() => void createCheckout()}
            disabled={!cartItems.length || createOrder.isPending}
            style={styles.actionHalf}
          >
            {createOrder.isPending ? "Creating..." : "Continue"}
          </ZookButton>
        </View>
      </ShopShell>
    );
  }

  const miniCart =
    itemCount > 0 ? (
      <Pressable
        onPress={() => setCheckoutState("cart")}
        style={styles.miniCart}
        accessibilityRole="button"
        accessibilityLabel="Open mini cart"
      >
        <Text style={styles.miniCartText}>
          {itemCount} items · {formatInr(totalPaise)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.bg} />
      </Pressable>
    ) : null;

  return (
    <ShopShell selectedPath="/shop" floatingAction={miniCart}>
      <MobileHeader
        title="Desk pickup"
        subtitle={activeOrganization?.name ?? "Active gym"}
        showProfileShortcut={false}
        trailing={
          <Pressable
            onPress={() => setCheckoutState("cart")}
            accessibilityRole="button"
            accessibilityLabel="Open cart"
            style={styles.cartIcon}
          >
            <Ionicons name="bag-outline" size={22} color={colors.text} />
            {itemCount ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            ) : null}
          </Pressable>
        }
      />

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search essentials" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRail}
      >
        {categories.map((option) => {
          const selected = option.value === category;
          return (
            <Pressable
              key={option.value}
              onPress={() => setCategory(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.categoryChip, selected ? styles.categoryChipActive : null]}
            >
              <Ionicons
                name={iconForCategory(option.value)}
                size={15}
                color={selected ? colors.bg : colors.muted}
              />
              <Text
                style={[styles.categoryChipText, selected ? styles.categoryChipTextActive : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader
        title="Available now"
        subtitle={`${filteredProducts.length} ${filteredProducts.length === 1 ? "item" : "items"}`}
      />

      {filteredProducts.length ? (
        <View style={styles.productGrid}>
          {filteredProducts.map((product) => {
            const lowStock = product.stock <= product.lowStockThreshold;
            const fulfillmentLabel =
              product.stock > 0 ? `${product.stock} in stock` : "Out of stock";
            return (
              <ProductCard
                key={product.id}
                name={product.name}
                price={formatInr(product.pricePaise)}
                stock={fulfillmentLabel}
                tone={product.stock <= 0 ? "red" : lowStock ? "amber" : "lime"}
                imageUrl={(product as { imageUrl?: string | null }).imageUrl}
                quantity={cart[product.id] ?? 0}
                icon={iconForCategory(product.category as Category)}
                compact
                onIncrement={() => addToCart(product.id)}
                onDecrement={() => removeFromCart(product.id)}
                style={styles.productCard}
              />
            );
          })}
        </View>
      ) : productsQuery.isLoading ? (
        <GlassCard variant="compact" contentStyle={styles.stack}>
          <ListRow
            title="Loading products"
            subtitle="Fetching the desk pickup catalog."
            icon="hourglass-outline"
            tone="amber"
          />
        </GlassCard>
      ) : (
        <EmptyState
          title="No products found"
          body="Try a different item or ask the desk for availability."
        />
      )}
    </ShopShell>
  );
}

function ShopShell({
  children,
  selectedPath,
  floatingAction,
}: {
  children: ReactNode;
  selectedPath: string;
  floatingAction?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const contentPaddingBottom =
    layout.bottomNavContentPadding + (floatingAction ? layout.stickyActionHeight : 0);
  const floatingBottom = layout.bottomNavHeight + Math.max(insets.bottom, 12) + 18;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          style={styles.scroller}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        >
          <View style={styles.content}>{children}</View>
        </ScrollView>
        {floatingAction ? (
          <View
            pointerEvents="box-none"
            style={[styles.floatingAction, { bottom: floatingBottom }]}
          >
            {floatingAction}
          </View>
        ) : null}
        <BottomNav selectedPath={selectedPath} />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth + layout.screenPadding * 2,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: 14,
    gap: 12,
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
    columnGap: 10,
    rowGap: 12,
  },
  productCard: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 190,
  },
  categoryRail: {
    gap: 8,
    paddingRight: layout.screenPadding,
  },
  categoryChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipActive: {
    borderColor: "rgba(185,244,85,0.44)",
    backgroundColor: colors.lime,
  },
  categoryChipText: {
    color: colors.muted,
    ...typography.caption,
  },
  categoryChipTextActive: {
    color: colors.bg,
  },
  miniCart: {
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
  floatingAction: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 35,
    elevation: 35,
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
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
});
