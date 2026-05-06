import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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
  BranchSelectorChip,
  EmptyState,
  ErrorState,
  GlassCard,
  ListRow,
  MobileHeader,
  ProductCard,
  SearchBar,
  SecondaryButton,
  SectionHeader,
  Skeleton,
  StickyActionBar,
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
import { useBranchSelection } from "@/lib/branch-selection";
import { useI18n } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT" | "OTHER";
type CheckoutState = "browse" | "cart" | "checkout" | "pickup";

const categories: Array<{ label: string; value: Category }> = [
  { label: "All", value: "ALL" },
  { label: "Water", value: "WATER" },
  { label: "Shake", value: "PROTEIN_SHAKE" },
  { label: "Cups", value: "SHAKER" },
  { label: "Towel", value: "TOWEL" },
  { label: "Supplements", value: "SUPPLEMENT" },
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

function pickupQrCells(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return Array.from({ length: 49 }, (_, index) => {
    const finder =
      (index < 14 && index % 7 < 2) ||
      (index % 7 > 4 && index < 14) ||
      (index > 34 && index % 7 < 2);
    return finder || ((hash >> (index % 24)) + index) % 3 === 0;
  });
}

function PickupQr({ value }: { value: string }) {
  return (
    <View accessibilityLabel="Pickup QR code" style={styles.pickupQr}>
      {pickupQrCells(value).map((filled, index) => (
        <View key={`${value}-${index}`} style={[styles.pickupQrCell, filled ? styles.pickupQrCellFilled : null]} />
      ))}
    </View>
  );
}

export default function Shop() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    focus?: string | string[];
  }>();
  const { activeOrgId, session } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
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
  const cartStorageKey = `zook_shop_cart_${activeOrgId ?? activeOrganization?.orgId ?? "default"}`;
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
  const storedItemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);

  useEffect(() => {
    let cancelled = false;
    setCartHydrated(false);
    void getStoredValue(cartStorageKey)
      .then((storedCart) => {
        if (cancelled) return;
        if (!storedCart) {
          setCart({});
          return;
        }
        const parsed = JSON.parse(storedCart) as Record<string, unknown>;
        const nextCart = Object.fromEntries(
          Object.entries(parsed)
            .map(([productId, quantity]) => [productId, Number(quantity)] as const)
            .filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0),
        );
        setCart(nextCart);
      })
      .catch(() => {
        if (!cancelled) setCart({});
      })
      .finally(() => {
        if (!cancelled) setCartHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartHydrated) return;
    if (storedItemCount > 0) {
      void setStoredValue(cartStorageKey, JSON.stringify(cart));
      return;
    }
    void deleteStoredValue(cartStorageKey);
  }, [cart, cartHydrated, cartStorageKey, storedItemCount]);

  useEffect(() => {
    if (!cartHydrated || !products.length) return;
    setCart((current) => {
      let changed = false;
      const next: Record<string, number> = {};
      Object.entries(current).forEach(([productId, quantity]) => {
        const product = products.find((candidate) => candidate.id === productId);
        if (!product || product.stock <= 0) {
          changed = true;
          return;
        }
        const clamped = Math.min(quantity, product.stock);
        if (clamped !== quantity) changed = true;
        next[productId] = clamped;
      });
      return changed ? next : current;
    });
  }, [cartHydrated, products]);

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
        const refreshedOrder = refreshed.data?.orders.find(
          (candidate) => candidate.id === order.id,
        );
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
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
    await completeMockPayment.mutateAsync({
      sessionId: checkoutSession.id,
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    });
    const refreshed = await ordersQuery.refetch();
    const paidOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
    setOrder(paidOrder ?? { ...order, status: "READY_FOR_PICKUP" });
    setCart({});
    void deleteStoredValue(cartStorageKey);
    setCheckoutState("pickup");
  }

  if (checkoutState === "pickup" && order) {
    const canContinuePayment = order.status === "PENDING_PAYMENT" && Boolean(checkoutSession);
    const canShowPickupQr = order.status === "READY_FOR_PICKUP" || order.status === "FULFILLED";
    return (
      <ShopShell
        selectedPath="/shop"
        stickyAction={
          canContinuePayment ? (
          <ZookButton
            onPress={() => void continuePayment()}
            disabled={completeMockPayment.isPending}
            icon="card-outline"
          >
            {completeMockPayment.isPending ? t("shop.confirming") : t("shop.continuePayment")}
          </ZookButton>
          ) : null
        }
      >
        <MobileHeader
          title={t("shop.readyForPickup")}
          subtitle={t("shop.readyForPickupSubtitle")}
          chip={<BranchSelectorChip />}
          showProfileShortcut={false}
        />
        <GlassCard variant="success" contentStyle={styles.pickupContent}>
          <Text style={styles.pickupLabel}>{t("shop.pickupCode")}</Text>
          <Text style={styles.pickupCode}>{order.pickupCode ?? t("shop.pending")}</Text>
          <StatusChip status={order.status.replace(/_/g, " ")} tone="lime" />
        </GlassCard>
        {canShowPickupQr ? (
          <GlassCard variant="compact" contentStyle={styles.pickupQrContent}>
            <Text style={styles.pickupQrTitle}>Show this to collect your order</Text>
            <PickupQr value={`zook://pickup/${order.id}`} />
            <Text style={styles.pickupQrCode}>Code: {order.pickupCode ?? t("shop.pending")}</Text>
          </GlassCard>
        ) : null}
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
                subtitle={`${item.quantity} ${t(item.quantity === 1 ? "shop.item" : "shop.items")} · ${formatInr(item.unitPaise)}`}
                trailing={<StatusChip status={t("shop.paid")} tone="neutral" />}
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
          {t("shop.backToShop")}
        </ZookButton>
      </ShopShell>
    );
  }

  if (checkoutState === "checkout" && order) {
    return (
      <ShopShell selectedPath="/shop">
        <MobileHeader
          title={t("shop.payment")}
          subtitle={t("shop.paymentSubtitle")}
          chip={<BranchSelectorChip />}
          showProfileShortcut={false}
        />
        <GlassCard contentStyle={styles.checkoutContent}>
          <ListRow
            title={t("shop.paySecurely")}
            subtitle={t("shop.confirmOrder")}
            trailing={<StatusChip status="1" tone="neutral" />}
          />
          <ListRow
            title={t("shop.getPickupCode")}
            subtitle={t("shop.makeDeskCode")}
            trailing={<StatusChip status="2" tone="amber" />}
          />
          <ListRow
            title={t("shop.collectAtDesk")}
            subtitle={t("shop.showPickupCode")}
            trailing={<StatusChip status="3" tone="lime" />}
          />
          <View style={styles.checkoutTotal}>
            <Text style={styles.cardBody}>{t("shop.orderTotal")}</Text>
            <Text style={styles.totalText}>{formatInr(order.totalPaise)}</Text>
          </View>
        </GlassCard>
      </ShopShell>
    );
  }

  if (checkoutState === "cart") {
    return (
      <ShopShell
        selectedPath="/shop"
        stickyAction={
          <View style={styles.actionRow}>
            <SecondaryButton onPress={() => setCheckoutState("browse")} style={styles.actionHalf}>
              {t("shop.back")}
            </SecondaryButton>
            <ZookButton
              onPress={() => void createCheckout()}
              disabled={!cartItems.length || createOrder.isPending}
              style={styles.actionHalf}
            >
              {createOrder.isPending ? t("shop.creating") : t("shop.continuePayment")}
            </ZookButton>
          </View>
        }
      >
        <MobileHeader
          eyebrow={t("shop.cart")}
          title={t("shop.reviewOrder")}
          subtitle={t("shop.reviewOrderSubtitle")}
          chip={
            <View style={styles.headerChipStack}>
              <BranchSelectorChip />
              <StatusChip
                status={`${itemCount} ${t(itemCount === 1 ? "shop.item" : "shop.items")}`}
                tone="lime"
              />
            </View>
          }
          showProfileShortcut={false}
        />
        <GlassCard variant="compact" contentStyle={styles.stack}>
          {cartItems.length ? (
            cartItems.map((item) => (
              <ListRow
                key={item.product.id}
                title={item.product.name}
                subtitle={`${item.quantity} ${t(item.quantity === 1 ? "shop.item" : "shop.items")} · ${item.product.stock} in stock`}
                trailing={
                  <View style={styles.cartLineTrailing}>
                    <Text style={styles.cartLinePrice}>
                      {formatInr(item.product.pricePaise * item.quantity)}
                    </Text>
                    <View style={styles.cartStepper}>
                      <Pressable
                        onPress={() => removeFromCart(item.product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.product.name}`}
                        style={styles.cartStepperButton}
                      >
                        <Ionicons name="remove" size={15} color={colors.lime} />
                      </Pressable>
                      <Text style={styles.cartQuantity}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => addToCart(item.product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.product.name}`}
                        disabled={item.quantity >= item.product.stock}
                        style={[
                          styles.cartStepperButton,
                          item.quantity >= item.product.stock ? styles.cartStepperDisabled : null,
                        ]}
                      >
                        <Ionicons name="add" size={15} color={colors.lime} />
                      </Pressable>
                    </View>
                  </View>
                }
              />
            ))
          ) : (
            <EmptyState title={t("shop.yourCartEmpty")} body={t("shop.cartEmptyBody")} />
          )}
        </GlassCard>
        <GlassCard variant="compact" contentStyle={styles.totalRow}>
          <Text style={styles.cardBody}>{t("shop.subtotal")}</Text>
          <Text style={styles.totalText}>{formatInr(totalPaise)}</Text>
        </GlassCard>
      </ShopShell>
    );
  }

  const miniCart =
    itemCount > 0 ? (
      <Pressable
        onPress={() => setCheckoutState("cart")}
        style={styles.miniCart}
        accessibilityRole="button"
        accessibilityLabel={t("shop.openMiniCart")}
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
        title={t("shop.deskPickup")}
        subtitle={activeOrganization?.name ?? t("shop.activeGym")}
        chip={<BranchSelectorChip />}
        showProfileShortcut={false}
        trailing={
          <Pressable
            onPress={() => setCheckoutState("cart")}
            accessibilityRole="button"
            accessibilityLabel={t("shop.openCart")}
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

      <SearchBar value={query} onChangeText={setQuery} placeholder={t("shop.searchEssentials")} />

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
        title={t("shop.availableNow")}
        subtitle={`${filteredProducts.length} ${t(filteredProducts.length === 1 ? "shop.item" : "shop.items")}`}
      />

      {productsQuery.isError ? (
        <GlassCard variant="danger" contentStyle={styles.stateCardContent}>
          <ErrorState
            title={t("shop.shopCouldNotLoad")}
            body={t("shop.shopCouldNotLoadBody")}
            action={
              <ZookButton
                onPress={() => void productsQuery.refetch()}
                tone="secondary"
                icon="refresh-outline"
              >
                {t("shop.tryAgain")}
              </ZookButton>
            }
          />
        </GlassCard>
      ) : productsQuery.isLoading || !cartHydrated ? (
        <ShopSkeleton />
      ) : filteredProducts.length ? (
        <View style={styles.productGrid}>
          {filteredProducts.map((product) => {
            const lowStock = product.stock <= product.lowStockThreshold;
            const fulfillmentLabel =
              product.stock > 0
                ? lowStock
                  ? `Only ${product.stock} left`
                  : `${product.stock} in stock`
                : "Out of stock";
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
                disabled={product.stock <= 0}
                incrementDisabled={(cart[product.id] ?? 0) >= product.stock}
                onIncrement={() => addToCart(product.id)}
                onDecrement={() => removeFromCart(product.id)}
                style={styles.productCard}
              />
            );
          })}
        </View>
      ) : (
        <EmptyState title={t("shop.noProductsFound")} body={t("shop.noProductsFoundBody")} />
      )}
    </ShopShell>
  );
}

function ShopSkeleton() {
  return (
    <View style={styles.productGrid}>
      {[0, 1, 2, 3].map((item) => (
        <GlassCard
          key={item}
          variant="compact"
          contentStyle={styles.productSkeleton}
          style={styles.productCard}
        >
          <Skeleton width="100%" height={84} borderRadius={18} />
          <Skeleton width="82%" height={16} borderRadius={8} />
          <Skeleton width="58%" height={13} borderRadius={7} />
          <View style={styles.skeletonFooter}>
            <Skeleton width={58} height={18} borderRadius={9} />
            <Skeleton width={64} height={30} borderRadius={15} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

function ShopShell({
  children,
  selectedPath,
  floatingAction,
  stickyAction,
}: {
  children: ReactNode;
  selectedPath: string;
  floatingAction?: ReactNode;
  stickyAction?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const contentPaddingBottom =
    layout.bottomNavContentPadding +
    (floatingAction ? layout.stickyActionHeight : 0) +
    (stickyAction ? layout.stickyActionHeight : 0);
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
        {stickyAction ? <StickyActionBar>{stickyAction}</StickyActionBar> : null}
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
  headerChipStack: {
    alignSelf: "flex-start",
    gap: 6,
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
  stateCardContent: {
    padding: 0,
  },
  productSkeleton: {
    gap: spacing.sm,
    padding: 12,
  },
  skeletonFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cartLineTrailing: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  cartLinePrice: {
    color: colors.text,
    ...typography.caption,
  },
  cartStepper: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  cartStepperButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  cartStepperDisabled: {
    opacity: 0.35,
  },
  cartQuantity: {
    minWidth: 22,
    textAlign: "center",
    color: colors.text,
    ...typography.caption,
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
  pickupQrContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  pickupQrTitle: {
    color: colors.text,
    ...typography.cardTitle,
    textAlign: "center",
  },
  pickupQr: {
    width: 154,
    height: 154,
    borderRadius: 18,
    backgroundColor: colors.text,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pickupQrCell: {
    width: 18,
    height: 18,
    backgroundColor: colors.text,
  },
  pickupQrCellFilled: {
    backgroundColor: colors.bg,
  },
  pickupQrCode: {
    color: colors.muted,
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
});
