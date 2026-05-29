import { Stack, useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BranchSelectorChip,
  EmptyState,
  ErrorState,
  GlassCard,
  ListRow,
  MobileHeader,
  ProductCard,
  SearchBar,
  SectionHeader,
  Skeleton,
  StickyActionBar,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { BottomNavVisibilityContext } from "@/components/primitives/bottom-nav-context";
import { formatInr } from "@/lib/formatting";
import {
  useCompleteMockPayment,
  useCreateShopOrder,
  useMyShopOrders,
  useShopProducts,
  type ShopOrderRecord,
} from "@/lib/domains";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { toWebUrl } from "@/lib/api";
import { useBranchSelection } from "@/lib/branch-selection";
import { useI18n } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { legacyColors, layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { PickupQrCode } from "@/components/primitives/pickup-qr";
import { getMobileApiMode } from "@/lib/runtime-mode";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT" | "OTHER";
type CheckoutState = "browse" | "cart" | "checkout" | "pickup";
type OptimisticShopOrder = Pick<
  ShopOrderRecord,
  "id" | "status" | "pickupCode" | "totalPaise" | "items"
>;
type ShopOrderViewRecord = ShopOrderRecord | OptimisticShopOrder;
type CartItemDraft = Array<{
  product: NonNullable<ShopOrderRecord["items"][number]["product"]>;
  quantity: number;
}>;

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

function checkoutUrlWithReturnUrl(url: string, sessionId: string) {
  const resolvedUrl = checkoutUrl(url);
  const returnUrl = `zook://payments/return?target=shop&session=${encodeURIComponent(sessionId)}`;
  try {
    const parsed = new URL(resolvedUrl);
    parsed.searchParams.set("return_url", returnUrl);
    return parsed.toString();
  } catch {
    const separator = resolvedUrl.includes("?") ? "&" : "?";
    return `${resolvedUrl}${separator}return_url=${encodeURIComponent(returnUrl)}`;
  }
}

const mockPaymentCompletionAvailable = getMobileApiMode() !== "backend";

function pickupQrPayload(order: ShopOrderViewRecord) {
  return JSON.stringify({
    type: "shop_pickup",
    orderId: order.id,
    code: order.pickupCode,
  });
}

function optimisticOrderFromCart(input: {
  orderId: string;
  totalPaise: number;
  cartItems: CartItemDraft;
}): OptimisticShopOrder {
  return {
    id: input.orderId,
    status: "PENDING_PAYMENT",
    pickupCode: null,
    totalPaise: input.totalPaise,
    items: input.cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      unitPaise: item.product.pricePaise,
      product: item.product,
    })),
  };
}

export default function Shop() {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const params = useLocalSearchParams<{
    orderId?: string | string[];
    sessionId?: string | string[];
    provider?: string | string[];
    checkoutUrl?: string | string[];
    totalPaise?: string | string[];
    focus?: string | string[];
  }>();
  const { activeOrgId, session } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const [category, setCategory] = useState<Category>("ALL");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartHydrated, setCartHydrated] = useState(false);
  const [order, setOrder] = useState<ShopOrderViewRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<{
    id: string;
    provider?: string;
    checkoutUrl?: string;
  } | null>(null);
  const [waitingCheckoutSessionId, setWaitingCheckoutSessionId] = useState<string | null>(null);
  const [checkingCheckoutStatus, setCheckingCheckoutStatus] = useState(false);
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const createOrder = useCreateShopOrder();
  const completeMockPayment = useCompleteMockPayment();
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const cartHydrationRetryRef = useRef(0);
  const checkoutState: CheckoutState = pathname.startsWith("/shop/pickup/")
    ? "pickup"
    : pathname === "/shop/checkout"
      ? "checkout"
      : pathname === "/shop/cart"
        ? "cart"
        : "browse";
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
  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      ALL: products.length,
      WATER: 0,
      PROTEIN_SHAKE: 0,
      SHAKER: 0,
      TOWEL: 0,
      SUPPLEMENT: 0,
      OTHER: 0,
    };
    products.forEach((product) => {
      const productCategory = (product.category as Category) ?? "OTHER";
      counts[productCategory] = (counts[productCategory] ?? 0) + 1;
    });
    return counts;
  }, [products]);
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
  const urlOrderId = firstParam(params.orderId);
  const urlSessionId = firstParam(params.sessionId);
  const urlProvider = firstParam(params.provider);
  const urlCheckoutUrl = firstParam(params.checkoutUrl);
  const urlTotalPaise = Number(firstParam(params.totalPaise) ?? 0);

  useEffect(() => {
    if (!urlOrderId || checkoutState !== "pickup") {
      return;
    }
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
    ]);
  }, [checkoutState, queryClient, urlOrderId]);

  useEffect(() => {
    let cancelled = false;
    setCartHydrated(false);
    cartHydrationRetryRef.current = 0;

    const hydrateCart = async () => {
      try {
        const storedCart = await getStoredValue(cartStorageKey);
        if (cancelled) return;
        if (!storedCart) {
          setCart({});
          setCartHydrated(true);
          return;
        }
        const parsed = JSON.parse(storedCart) as Record<string, unknown>;
        const nextCart = Object.fromEntries(
          Object.entries(parsed)
            .map(([productId, quantity]) => [productId, Number(quantity)] as const)
            .filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0),
        );
        setCart(nextCart);
        setCartHydrated(true);
      } catch {
        if (cancelled) return;
        if (cartHydrationRetryRef.current < 2) {
          cartHydrationRetryRef.current += 1;
          setTimeout(() => {
            if (!cancelled) {
              void hydrateCart();
            }
          }, 250 * cartHydrationRetryRef.current);
          return;
        }
        setCart({});
        setCartHydrated(true);
        showToast({
          title: "Cart reset",
          message: "We could not restore your saved cart.",
          tone: "amber",
          haptic: "warning",
        });
      }
    };

    void hydrateCart();
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
    if (!urlOrderId) {
      return;
    }
    const matchedOrder = ordersQuery.data?.orders.find((candidate) => candidate.id === urlOrderId);
    if (matchedOrder) {
      setOrder(matchedOrder);
      return;
    }
    if (checkoutState === "checkout" && !order) {
      setOrder(
        optimisticOrderFromCart({
          orderId: urlOrderId,
          totalPaise: Number.isFinite(urlTotalPaise) ? urlTotalPaise : totalPaise,
          cartItems,
        }),
      );
    }
  }, [
    cartItems,
    checkoutState,
    order,
    ordersQuery.data?.orders,
    totalPaise,
    urlOrderId,
    urlTotalPaise,
  ]);

  useEffect(() => {
    if (!urlSessionId) return;
    setCheckoutSession({
      id: urlSessionId,
      ...(urlProvider ? { provider: urlProvider } : {}),
      ...(urlCheckoutUrl ? { checkoutUrl: urlCheckoutUrl } : {}),
    });
  }, [urlCheckoutUrl, urlProvider, urlSessionId]);

  const refreshShopCheckoutStatus = useCallback(async () => {
    if (!order) return;
    setCheckingCheckoutStatus(true);
    try {
      const refreshed = await ordersQuery.refetch();
      const refreshedOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
      if (refreshedOrder && refreshedOrder.status !== "PENDING_PAYMENT") {
        setOrder(refreshedOrder);
        setCart({});
        setWaitingCheckoutSessionId(null);
        void deleteStoredValue(cartStorageKey);
        router.replace(`/shop/pickup/${refreshedOrder.id}` as never);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
          queryClient.invalidateQueries({ queryKey: ["org"] }),
        ]);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] });
    } finally {
      setCheckingCheckoutStatus(false);
    }
  }, [cartStorageKey, order, ordersQuery, queryClient, router]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (nextState !== "active" || !wasAway || !refreshAfterCheckoutRef.current || !order) {
        return;
      }
      refreshAfterCheckoutRef.current = false;
      void refreshShopCheckoutStatus();
    });
    return () => subscription.remove();
  }, [order, refreshShopCheckoutStatus]);

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
    try {
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
      showToast({ tone: "success", haptic: "success", message: "Checkout ready." });
      router.push({
        pathname: "/shop/checkout",
        params: {
          orderId: result.order.id,
          sessionId: result.session.id,
          ...(result.session.provider ? { provider: result.session.provider } : {}),
          ...(result.checkoutUrl ? { checkoutUrl: result.checkoutUrl } : {}),
          totalPaise: String(result.order.totalPaise),
        },
      } as never);
    } catch (error) {
      showToast({
        title: "Action failed",
        message: getApiErrorMessage(error) || "Could not create checkout.",
        tone: "danger",
        haptic: "error",
      });
    }
  }

  async function continuePayment() {
    if (!order || !checkoutSession) return;
    if (
      checkoutSession.provider &&
      checkoutSession.provider !== "mock" &&
      checkoutSession.checkoutUrl
    ) {
      refreshAfterCheckoutRef.current = true;
      setWaitingCheckoutSessionId(checkoutSession.id);
      await Linking.openURL(
        checkoutUrlWithReturnUrl(checkoutSession.checkoutUrl, checkoutSession.id),
      );
      return;
    }
    if (!mockPaymentCompletionAvailable && checkoutSession.provider !== "mock") {
      throw new Error("Mock payment completion is not available in backend builds.");
    }
    try {
      await completeMockPayment.mutateAsync({
        sessionId: checkoutSession.id,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      });
      const refreshed = await ordersQuery.refetch();
      const paidOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
      setOrder(paidOrder ?? { ...order, status: "READY_FOR_PICKUP" });
      setCart({});
      void deleteStoredValue(cartStorageKey);
      showToast({ tone: "success", haptic: "success", message: "Payment confirmed." });
      router.replace(`/shop/pickup/${(paidOrder ?? order).id}` as never);
    } catch (error) {
      showToast({
        title: "Action failed",
        message: getApiErrorMessage(error) || "Payment could not be completed.",
        tone: "danger",
        haptic: "error",
      });
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={legacyColors.lime}
      colors={[legacyColors.lime]}
    />
  );

  const headerBackButton = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={[
        styles.iconButton,
        {
          borderColor: palette.border.subtle,
          backgroundColor: palette.bg.elevated,
        },
      ]}
    >
      <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
    </Pressable>
  );

  if (checkoutState === "pickup" && order) {
    const canContinuePayment = order.status === "PENDING_PAYMENT" && Boolean(checkoutSession);
    const canShowPickupQr = order.status === "READY_FOR_PICKUP" || order.status === "FULFILLED";
    return (
      <ShopShell
        selectedPath="/shop"
        refreshControl={refreshControl}
        stickyAction={
          canContinuePayment ? (
            <ZookButton
              testID="shop-continue-payment-sticky"
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
          leading={headerBackButton}
          chip={<BranchSelectorChip />}
          showProfileShortcut={false}
        />
        {waitingCheckoutSessionId ? (
          <BrowserReturnCard
            checking={checkingCheckoutStatus}
            onCheckStatus={() => void refreshShopCheckoutStatus()}
          />
        ) : null}
        <GlassCard variant="success" contentStyle={styles.pickupContent}>
          <Text style={[styles.pickupLabel, { color: palette.text.secondary }]}>{t("shop.pickupCode")}</Text>
          <Pressable
            onPress={async () => {
              if (!order.pickupCode) return;
              try {
                await Clipboard.setStringAsync(order.pickupCode);
                showToast({ tone: "success", message: t("shop.pickupCodeCopied") });
              } catch {
                showToast({ tone: "danger", message: t("shop.pickupCodeCopyFailed") });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              order.pickupCode
                ? `Copy pickup code ${order.pickupCode}`
                : "Pickup code pending"
            }
            disabled={!order.pickupCode}
            hitSlop={6}
          >
            <Text style={[styles.pickupCode, { color: palette.text.primary }]}>{order.pickupCode ?? t("shop.pending")}</Text>
          </Pressable>
          <StatusChip status={order.status.replace(/_/g, " ")} tone="lime" />
        </GlassCard>
        {canShowPickupQr ? (
          <GlassCard variant="compact" contentStyle={styles.pickupQrContent}>
            <Text style={[styles.pickupQrTitle, { color: palette.text.primary }]}>Show this to collect your order</Text>
            <PickupQrCode value={pickupQrPayload(order)} />
            <Text style={[styles.pickupQrCode, { color: palette.text.secondary }]}>Code: {order.pickupCode ?? t("shop.pending")}</Text>
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
          testID="shop-back-to-shop"
          onPress={() => {
            setOrder(null);
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
      <ShopShell
        selectedPath="/shop"
        refreshControl={refreshControl}
        stickyAction={
          <ZookButton
            testID="shop-continue-payment"
            onPress={() => void continuePayment()}
            disabled={!checkoutSession || completeMockPayment.isPending}
            icon="card-outline"
          >
            {completeMockPayment.isPending ? t("shop.confirming") : t("shop.continuePayment")}
          </ZookButton>
        }
      >
        <MobileHeader
          title={t("shop.payment")}
          subtitle={t("shop.paymentSubtitle")}
          leading={headerBackButton}
          chip={<BranchSelectorChip />}
          showProfileShortcut={false}
        />
        {waitingCheckoutSessionId ? (
          <BrowserReturnCard
            checking={checkingCheckoutStatus}
            onCheckStatus={() => void refreshShopCheckoutStatus()}
          />
        ) : null}
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
          <View style={[styles.checkoutTotal, { borderTopColor: palette.border.subtle }]}>
            <Text style={[styles.cardBody, { color: palette.text.secondary }]}>{t("shop.orderTotal")}</Text>
            <Text style={[styles.totalText, { color: palette.text.primary }]}>{formatInr(order.totalPaise)}</Text>
          </View>
        </GlassCard>
      </ShopShell>
    );
  }

  if (checkoutState === "cart") {
    return (
      <ShopShell
        selectedPath="/shop"
        refreshControl={refreshControl}
        stickyAction={
          <ZookButton
            testID="shop-cart-checkout"
            onPress={() => void createCheckout()}
            disabled={!cartItems.length || createOrder.isPending}
            fullWidth
          >
            {createOrder.isPending ? t("shop.creating") : t("shop.continuePayment")}
          </ZookButton>
        }
      >
        <MobileHeader
          eyebrow={t("shop.cart")}
          title={t("shop.reviewOrder")}
          subtitle={t("shop.reviewOrderSubtitle")}
          leading={headerBackButton}
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
                    <Text style={[styles.cartLinePrice, { color: palette.text.primary }]}>
                      {formatInr(item.product.pricePaise * item.quantity)}
                    </Text>
                    <View style={[styles.cartStepper, { borderColor: palette.border.subtle, backgroundColor: palette.bg.sunken }]}>
                      <Pressable
                        testID={`shop-cart-remove-${item.product.id}`}
                        onPress={() => removeFromCart(item.product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.product.name}`}
                        style={styles.cartStepperButton}
                      >
                        <Ionicons name="remove" size={15} color={palette.accent.strong} />
                      </Pressable>
                      <Text style={[styles.cartQuantity, { color: palette.text.primary }]}>{item.quantity}</Text>
                      <Pressable
                        testID={`shop-cart-add-${item.product.id}`}
                        onPress={() => addToCart(item.product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${item.product.name}`}
                        disabled={item.quantity >= item.product.stock}
                        style={[
                          styles.cartStepperButton,
                          item.quantity >= item.product.stock ? styles.cartStepperDisabled : null,
                        ]}
                      >
                        <Ionicons name="add" size={15} color={palette.accent.strong} />
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
          <Text style={[styles.cardBody, { color: palette.text.secondary }]}>{t("shop.subtotal")}</Text>
          <Text style={[styles.totalText, { color: palette.text.primary }]}>{formatInr(totalPaise)}</Text>
        </GlassCard>
      </ShopShell>
    );
  }

  const miniCart =
    itemCount > 0 ? (
      <Pressable
        testID="shop-mini-cart"
        onPress={() => router.push("/shop/cart" as never)}
        style={styles.miniCart}
        accessibilityRole="button"
        accessibilityLabel={t("shop.openMiniCart")}
      >
        <Text style={styles.miniCartText}>
          {itemCount} items · {formatInr(totalPaise)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={legacyColors.bg} />
      </Pressable>
    ) : null;

  const contentPaddingBottom = useBottomScrollPadding({
    hasStickyAction: Boolean(miniCart),
  });

  return (
    <ShopShell selectedPath="/shop" floatingAction={miniCart} refreshControl={refreshControl} noScroll={true}>
      <FlatList
        data={productsQuery.isLoading || !cartHydrated || productsQuery.isError ? [] : filteredProducts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const lowStock = item.stock <= item.lowStockThreshold;
          const fulfillmentLabel =
            item.stock > 0
              ? lowStock
                ? `Only ${item.stock} left`
                : `${item.stock} in stock`
              : "Out of stock";
          const productImageUrl = item.imageUrl ?? item.imageUrls?.[0] ?? null;
          return (
            <ProductCard
              testID={index === 0 ? "shop-product-first" : `shop-product-${item.id}`}
              name={item.name}
              price={formatInr(item.pricePaise)}
              stock={fulfillmentLabel}
              tone={item.stock <= 0 ? "red" : lowStock ? "amber" : "lime"}
              imageUrl={productImageUrl}
              quantity={cart[item.id] ?? 0}
              icon={iconForCategory(item.category as Category)}
              compact
              disabled={item.stock <= 0}
              incrementDisabled={(cart[item.id] ?? 0) >= item.stock}
              onIncrement={() => addToCart(item.id)}
              onDecrement={() => removeFromCart(item.id)}
              style={styles.productCard}
            />
          );
        }}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <MobileHeader
              title={t("shop.deskPickup")}
              subtitle={activeOrganization?.name ?? t("shop.activeGym")}
              chip={<BranchSelectorChip />}
              showProfileShortcut={false}
              trailing={
                <Pressable
                  testID="shop-open-cart"
                  onPress={() => router.push("/shop/cart" as never)}
                  accessibilityRole="button"
                  accessibilityLabel={t("shop.openCart")}
                  style={[
                    styles.cartIcon,
                    {
                      borderColor: palette.border.subtle,
                      backgroundColor: palette.bg.elevated,
                    },
                  ]}
                >
                  <Ionicons name="bag-outline" size={22} color={palette.text.primary} />
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
              style={{ marginVertical: 6 }}
            >
              {categories.map((option) => {
                const selected = option.value === category;
                const count = categoryCounts[option.value] ?? 0;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setCategory(option.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? palette.accent.fill
                          : mode === "dark"
                            ? "rgba(255, 255, 255, 0.06)"
                            : "rgba(17, 21, 15, 0.04)",
                        borderColor: selected ? palette.accent.strong : palette.border.subtle,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconForCategory(option.value)}
                      size={15}
                      color={selected ? palette.text.onAccent : palette.text.secondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color: selected ? palette.text.onAccent : palette.text.secondary,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <View
                      style={[
                        styles.categoryCount,
                        {
                          backgroundColor: selected
                            ? "rgba(0, 0, 0, 0.12)"
                            : mode === "dark"
                              ? "rgba(255, 255, 255, 0.08)"
                              : "rgba(0, 0, 0, 0.06)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryCountText,
                          {
                            color: selected ? palette.text.onAccent : palette.text.secondary,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
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
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !productsQuery.isLoading && cartHydrated && !productsQuery.isError && !filteredProducts.length ? (
            <EmptyState title={t("shop.noProductsFound")} body={t("shop.noProductsFoundBody")} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
        refreshControl={refreshControl}
      />
    </ShopShell>
  );
}

function BrowserReturnCard({
  checking,
  onCheckStatus,
}: {
  checking: boolean;
  onCheckStatus: () => void;
}) {
  const { palette } = useTheme();
  return (
    <GlassCard variant="compact" contentStyle={styles.browserReturnContent}>
      <Ionicons name="open-outline" size={22} color={palette.feedback.warning} />
      <View style={styles.browserReturnCopy}>
        <Text style={[styles.browserReturnTitle, { color: palette.text.primary }]}>
          Continue in browser
        </Text>
        <Text style={[styles.browserReturnBody, { color: palette.text.secondary }]}>
          Come back after payment. We will refresh your order status automatically.
        </Text>
      </View>
      <ZookButton
        tone="secondary"
        disabled={checking}
        onPress={onCheckStatus}
        icon="refresh-outline"
      >
        {checking ? "Checking..." : "Check status"}
      </ZookButton>
    </GlassCard>
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
  refreshControl,
  noScroll = false,
}: {
  children: ReactNode;
  selectedPath: string;
  floatingAction?: ReactNode;
  stickyAction?: ReactNode;
  refreshControl?: ScrollViewProps["refreshControl"];
  noScroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { visible: bottomNavVisible } = useContext(BottomNavVisibilityContext);
  const contentPaddingBottom = useBottomScrollPadding({
    hasStickyAction: Boolean(floatingAction || stickyAction),
  });
  const floatingBottom =
    (bottomNavVisible ? layout.bottomNavHeight : 0) + Math.max(insets.bottom, 12) + 18;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID={`shop-${selectedPath.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-screen`}>
        {noScroll ? (
          <View style={{ flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: 20 }}>
            {children}
          </View>
        ) : (
          <ScrollView
            style={styles.scroller}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
            refreshControl={refreshControl}
          >
            <View style={styles.content}>{children}</View>
          </ScrollView>
        )}
        {floatingAction ? (
          <View
            pointerEvents="box-none"
            style={[styles.floatingAction, { bottom: floatingBottom }]}
          >
            {floatingAction}
          </View>
        ) : null}
        {stickyAction ? <StickyActionBar>{stickyAction}</StickyActionBar> : null}
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
    paddingTop: 20,
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  cartIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  headerChipStack: {
    alignSelf: "flex-start",
    gap: 6,
  },
  browserReturnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  browserReturnCopy: {
    flex: 1,
    minWidth: 190,
    gap: 4,
  },
  browserReturnTitle: {
    color: legacyColors.text,
    ...typography.cardTitle,
  },
  browserReturnBody: {
    color: legacyColors.muted,
    ...typography.body,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: legacyColors.lime,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  cartBadgeText: {
    color: legacyColors.bg,
    ...typography.navLabel,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 12,
  },
  productCard: {
    flex: 1,
    maxWidth: "48.5%",
    height: 206,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryRail: {
    gap: 8,
    paddingRight: layout.screenPadding,
  },
  categoryChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryChipActive: {
    borderColor: "rgba(185,244,85,0.44)",
    backgroundColor: legacyColors.lime,
  },
  categoryChipText: {
    color: legacyColors.muted,
    ...typography.caption,
  },
  categoryChipTextActive: {
    color: legacyColors.bg,
  },
  categoryCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 5,
  },
  categoryCountActive: {
    backgroundColor: "rgba(7,9,8,0.18)",
  },
  categoryCountText: {
    color: legacyColors.muted,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
  categoryCountTextActive: {
    color: legacyColors.bg,
  },
  miniCart: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: legacyColors.lime,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...{
      shadowColor: legacyColors.lime,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
  },
  miniCartText: {
    flexShrink: 1,
    minWidth: 0,
    color: legacyColors.bg,
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
    color: legacyColors.text,
    ...typography.caption,
  },
  cartStepper: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: legacyColors.border,
    backgroundColor: legacyColors.panel,
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
    color: legacyColors.text,
    ...typography.caption,
  },
  cardBody: {
    color: legacyColors.muted,
    ...typography.body,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalText: {
    color: legacyColors.text,
    ...typography.metric,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
    minWidth: 0,
  },
  checkoutContent: {
    gap: 10,
  },
  checkoutTotal: {
    borderTopWidth: 1,
    borderTopColor: legacyColors.border,
    paddingTop: 14,
    marginTop: 4,
  },
  pickupContent: {
    alignItems: "center",
    gap: 10,
  },
  pickupLabel: {
    color: legacyColors.muted,
    ...typography.eyebrow,
  },
  pickupCode: {
    color: legacyColors.text,
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
    color: legacyColors.text,
    ...typography.cardTitle,
    textAlign: "center",
  },
  pickupQrCode: {
    color: legacyColors.muted,
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
});
