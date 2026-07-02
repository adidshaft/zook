import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BranchSelectorChip,
  ScreenHeader,
  MoneySummaryCard,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { formatInr } from "@/lib/formatting";
import {
  useCompleteMockPayment,
  useCreateShopOrder,
  useMyShopOrders,
  useShopProducts,
  type ShopOrderRecord,
} from "@/lib/domains";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { paymentsApi } from "@/lib/domain-api";
import { toWebUrl } from "@/lib/api";
import { useBranchSelection } from "@/lib/branch-selection";
import { useI18n } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { getMobileApiMode } from "@/lib/runtime-mode";
import { ShopCartSection } from "@/features/shop/shop-cart-section";
import { ShopCheckoutSection } from "@/features/shop/shop-checkout-section";
import { ShopPickupSection } from "@/features/shop/shop-pickup-section";
import { ShopMiniCart } from "@/features/shop/shop-mini-cart";
import { ShopBrowserReturnCard } from "@/features/shop/shop-browser-return-card";
import { ShopBrowseGrid } from "@/features/shop/shop-browse-grid";
import {
  ShopBrowseHeader,
  shopCategories,
  type ShopCategory,
} from "@/features/shop/shop-browse-header";
import { shopStyles as styles } from "./shop-index-route.styles";

type CheckoutState = "browse" | "cart" | "checkout" | "pickup";
type ShopPaymentMode = "ONLINE" | "DESK";
type PersistedCheckoutContext = {
  checkoutSession: {
    id: string;
    provider?: string;
    checkoutUrl?: string;
  } | null;
  order: ShopOrderViewRecord | null;
};
type OptimisticShopOrder = Pick<
  ShopOrderRecord,
  "id" | "status" | "pickupCode" | "totalPaise" | "items"
>;
type ShopOrderViewRecord = ShopOrderRecord | OptimisticShopOrder;
type CartItemDraft = Array<{
  product: NonNullable<ShopOrderRecord["items"][number]["product"]>;
  quantity: number;
}>;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
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

function orderActionPriority(order: ShopOrderRecord) {
  const status = String(order.status ?? "").toUpperCase();
  if (status === "READY_FOR_PICKUP" || (order.pickupCode && !order.fulfilledAt)) return 0;
  if (status === "PENDING_PAYMENT") return 1;
  if (status === "PROCESSING" || status === "PAID") return 2;
  if (status === "FULFILLED") return 4;
  if (status === "CANCELLED") return 5;
  return 3;
}

function orderTimestamp(order: ShopOrderRecord) {
  const timestamp = new Date(order.updatedAt ?? order.createdAt ?? 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function Shop() {
  const { palette } = useTheme();
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
    qaBrowse?: string | string[];
  }>();
  const { activeOrgId, session, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const [category, setCategory] = useState<ShopCategory>("ALL");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
  const [showDeskPaymentOption, setShowDeskPaymentOption] = useState(false);
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
  const locationContext = <BranchSelectorChip variant="inline" style={styles.headerBranchSelector} />;
  const cartStorageKey = `zook_shop_cart_${activeOrgId ?? activeOrganization?.orgId ?? "default"}`;
  const checkoutContextStoragePrefix = `zook_shop_checkout_${activeOrgId ?? activeOrganization?.orgId ?? "default"}`;
  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data?.products]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = category === "ALL" || product.category === category;
      const queryMatch = !debouncedQuery || product.name.toLowerCase().includes(debouncedQuery.toLowerCase());
      return categoryMatch && queryMatch;
    });
  }, [category, products, debouncedQuery]);
  const categoryCounts = useMemo(() => {
    const counts: Record<ShopCategory, number> = {
      ALL: products.length,
      WATER: 0,
      PROTEIN_SHAKE: 0,
      SHAKER: 0,
      TOWEL: 0,
      SUPPLEMENT: 0,
      OTHER: 0,
    };
    products.forEach((product) => {
      const productCategory = (product.category as ShopCategory) ?? "OTHER";
      counts[productCategory] = (counts[productCategory] ?? 0) + 1;
    });
    return counts;
  }, [products]);
  const visibleCategories = useMemo(
    () => shopCategories.filter((option) => option.value === "ALL" || (categoryCounts[option.value] ?? 0) > 0),
    [categoryCounts],
  );
  useEffect(() => {
    if (category !== "ALL" && (categoryCounts[category] ?? 0) === 0) {
      setCategory("ALL");
    }
  }, [category, categoryCounts]);
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
  const recentOrders = [...(ordersQuery.data?.orders ?? [])]
    .sort((left, right) => {
      const priority = orderActionPriority(left) - orderActionPriority(right);
      return priority || orderTimestamp(right) - orderTimestamp(left);
    })
    .slice(0, 3);
  const pinnedOrder = recentOrders.find((candidate) => {
    const status = String(candidate.status ?? "").toUpperCase();
    return (
      status === "READY_FOR_PICKUP" ||
      status === "PENDING_PAYMENT" ||
      status === "PROCESSING" ||
      status === "PAID" ||
      Boolean(candidate.pickupCode && !candidate.fulfilledAt)
    );
  });
  // Called unconditionally (before any state-based early return) to keep hook order stable.
  const contentPaddingBottom = useBottomScrollPadding({ hasStickyAction: itemCount > 0 });
  const storedItemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const urlOrderId = firstParam(params.orderId);
  const urlSessionId = firstParam(params.sessionId);
  const urlProvider = firstParam(params.provider);
  const urlCheckoutUrl = firstParam(params.checkoutUrl);
  const urlTotalPaise = Number(firstParam(params.totalPaise) ?? 0);
  const qaBrowse = firstParam(params.qaBrowse) === "1";
  const checkoutContextStorageKey = urlOrderId
    ? `${checkoutContextStoragePrefix}_${urlOrderId}`
    : order?.id
      ? `${checkoutContextStoragePrefix}_${order.id}`
      : null;

  useEffect(() => {
    if (!qaBrowse) {
      return;
    }
    let cancelled = false;
    void (async () => {
      await deleteStoredValue(cartStorageKey);
      if (order?.id) {
        await deleteStoredValue(`${checkoutContextStoragePrefix}_${order.id}`);
      }
      if (cancelled) {
        return;
      }
      setCart({});
      setOrder(null);
      setCheckoutSession(null);
      setWaitingCheckoutSessionId(null);
      router.replace("/shop" as never);
    })();
    return () => {
      cancelled = true;
    };
  }, [cartStorageKey, checkoutContextStoragePrefix, order?.id, qaBrowse, router]);

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
          title: t("shop.cartReset"),
          message: t("shop.cartResetBody"),
          tone: "amber",
          haptic: "warning",
        });
      }
    };

    void hydrateCart();
    return () => {
      cancelled = true;
    };
  }, [cartStorageKey, t]);

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

  useEffect(() => {
    if (!urlOrderId || !checkoutContextStorageKey) {
      return;
    }
    let cancelled = false;
    void getStoredValue(checkoutContextStorageKey).then((stored) => {
      if (cancelled || !stored) {
        return;
      }
      try {
        const parsed = JSON.parse(stored) as PersistedCheckoutContext;
        if (!order && parsed.order?.id === urlOrderId) {
          setOrder(parsed.order);
        }
        if (!checkoutSession && parsed.checkoutSession?.id) {
          setCheckoutSession(parsed.checkoutSession);
        }
      } catch {
        void deleteStoredValue(checkoutContextStorageKey);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checkoutContextStorageKey, checkoutSession, order, urlOrderId]);

  useEffect(() => {
    if (!checkoutContextStorageKey) {
      return;
    }
    if (!order?.id || order.status !== "PENDING_PAYMENT") {
      void deleteStoredValue(checkoutContextStorageKey);
      return;
    }
    const payload: PersistedCheckoutContext = {
      order,
      checkoutSession,
    };
    void setStoredValue(checkoutContextStorageKey, JSON.stringify(payload));
  }, [checkoutContextStorageKey, checkoutSession, order]);

  const refreshShopCheckoutStatus = useCallback(async () => {
    if (!order) return;
    setCheckingCheckoutStatus(true);
    try {
      if (checkoutSession?.id && token) {
        await paymentsApi.refreshPaymentSession({
          token,
          sessionId: checkoutSession.id,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        });
      }
      const refreshed = await ordersQuery.refetch();
      const refreshedOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
      if (refreshedOrder && refreshedOrder.status !== "PENDING_PAYMENT") {
        setOrder(refreshedOrder);
        setCart({});
        setWaitingCheckoutSessionId(null);
        void deleteStoredValue(cartStorageKey);
        if (checkoutContextStorageKey) {
          void deleteStoredValue(checkoutContextStorageKey);
        }
        router.replace(`/shop/pickup/${refreshedOrder.id}` as never);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
          queryClient.invalidateQueries({ queryKey: ["org"] }),
        ]);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] });
      showToast({
        tone: "amber",
        haptic: "warning",
        message: t("shop.paymentStillPending"),
      });
    } finally {
      setCheckingCheckoutStatus(false);
    }
  }, [
    activeOrgId,
    cartStorageKey,
    checkoutContextStorageKey,
    checkoutSession?.id,
    order,
    ordersQuery,
    queryClient,
    router,
    selectedBranchId,
    t,
    token,
  ]);

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

  async function createCheckout(paymentMode: ShopPaymentMode) {
    try {
      const result = await createOrder.mutateAsync({
        items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        paymentMode,
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
      if (paymentMode === "DESK" || !result.session) {
        setCheckoutSession(null);
        setCart({});
        void deleteStoredValue(cartStorageKey);
        showToast({ tone: "success", haptic: "success", message: t("shop.deskPaymentOrderCreated") });
        router.replace(`/shop/pickup/${result.order.id}` as never);
        return;
      }
      setCheckoutSession({
        id: result.session.id,
        provider: result.session.provider,
        ...(result.checkoutUrl ? { checkoutUrl: result.checkoutUrl } : {}),
      });
      showToast({ tone: "success", haptic: "success", message: t("shop.checkoutCreated") });
      router.replace({
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
        title: t("common.actionFailed"),
        message: getApiErrorMessage(error) || t("shop.couldNotCreateCheckout"),
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
      throw new Error(t("shop.mockPaymentUnavailable"));
    }
    try {
      await completeMockPayment.mutateAsync({
        sessionId: checkoutSession.id,
        ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
      });
      const refreshed = await ordersQuery.refetch();
      const paidOrder = refreshed.data?.orders.find((candidate) => candidate.id === order.id);
      setOrder(paidOrder ?? { ...order, status: "READY_FOR_PICKUP" });
      setCheckoutSession(null);
      setCart({});
      void deleteStoredValue(cartStorageKey);
      if (checkoutContextStorageKey) {
        void deleteStoredValue(checkoutContextStorageKey);
      }
      showToast({ tone: "success", haptic: "success", message: t("shop.paymentConfirmed") });
      router.replace(`/shop/pickup/${(paidOrder ?? order).id}` as never);
    } catch (error) {
      showToast({
        title: t("common.actionFailed"),
        message: getApiErrorMessage(error) || t("shop.paymentCouldNotComplete"),
        tone: "danger",
        haptic: "error",
      });
    }
  }

  async function copyPickupCode() {
    if (!order?.pickupCode) return;
    try {
      await Clipboard.setStringAsync(order.pickupCode);
      showToast({ tone: "success", message: t("shop.pickupCodeCopied") });
    } catch {
      showToast({ tone: "danger", message: t("shop.pickupCodeCopyFailed") });
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
      tintColor={palette.accent.base}
      colors={[palette.accent.base]}
    />
  );

  const headerBackButton = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      accessibilityRole="button"
      accessibilityLabel={t("shop.back")}
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
    const waitingForDeskPayment = order.status === "PENDING_PAYMENT" && !checkoutSession;
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
        <ScreenHeader
          title={waitingForDeskPayment ? t("shop.paymentPending") : t("shop.readyForPickup")}
          subtitle={waitingForDeskPayment ? t("shop.payAtDeskSubtitle") : t("shop.readyForPickupSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        <ShopPickupSection
          cartItems={cartItems}
          checkingCheckoutStatus={checkingCheckoutStatus}
          order={order}
          products={products}
          showBrowserReturn={Boolean(waitingCheckoutSessionId)}
          t={t}
          onBackToShop={() => {
            setOrder(null);
            router.replace("/shop" as never);
          }}
          onCheckStatus={() => void refreshShopCheckoutStatus()}
          onCopyPickupCode={() => void copyPickupCode()}
        />
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
        <ScreenHeader
          title={t("shop.payment")}
          subtitle={t("shop.paymentSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        {waitingCheckoutSessionId ? (
          <ShopBrowserReturnCard
            checking={checkingCheckoutStatus}
            t={t}
            onCheckStatus={() => void refreshShopCheckoutStatus()}
          />
        ) : null}
        <MoneySummaryCard
          title={t("shop.subtotal")}
          amount={formatInr(order.totalPaise)}
          rows={[
            { label: t("shop.itemsLabel"), value: t(order.items.length === 1 ? "shop.itemCount" : "shop.itemsCount", { count: order.items.length }) },
            { label: t("shop.pickupLabel"), value: t("shop.availableAtGymDesk") },
          ]}
          consequence={t("shop.checkoutConsequence")}
        />
      </ShopShell>
    );
  }
  if (checkoutState === "checkout") {
    return (
      <ShopShell
        selectedPath="/shop"
        refreshControl={refreshControl}
        stickyAction={
          <ZookButton
            testID="shop-pay-online"
            onPress={() => void createCheckout("ONLINE")}
            disabled={!cartItems.length || createOrder.isPending}
            busy={createOrder.isPending}
            busyLabel={t("shop.creating")}
            icon="card-outline"
            fullWidth
          >
            {t("shop.payOnline")}
          </ZookButton>
        }
      >
        <ScreenHeader
          title={t("shop.choosePaymentMethod")}
          subtitle={t("shop.choosePaymentMethodSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        <ShopCheckoutSection
          cartItems={cartItems}
          createOrderPending={createOrder.isPending}
          itemCount={itemCount}
          showDeskPaymentOption={showDeskPaymentOption}
          totalPaise={totalPaise}
          t={t}
          onCreateDeskCheckout={() => void createCheckout("DESK")}
          onShowDeskPaymentOption={() => setShowDeskPaymentOption(true)}
        />
      </ShopShell>
    );
  }

  if (checkoutState === "cart") {
    return (
      <ShopShell
        selectedPath="/shop"
        refreshControl={refreshControl}
        stickyAction={
          cartItems.length ? (
          <ZookButton
            testID="shop-cart-checkout"
            onPress={() => void createCheckout("ONLINE")}
            disabled={!cartItems.length || createOrder.isPending}
            busy={createOrder.isPending}
            busyLabel={t("shop.creating")}
            icon="card-outline"
            fullWidth
          >
            {createOrder.isPending
              ? t("shop.creating")
              : t("shop.payAmountNow", { amount: formatInr(totalPaise) })}
          </ZookButton>
          ) : null
        }
      >
        <ScreenHeader
          title={t("shop.reviewOrder")}
          subtitle={t("shop.reviewOrderSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        <ShopCartSection
          cartItems={cartItems}
          createOrderPending={createOrder.isPending}
          showDeskPaymentOption={showDeskPaymentOption}
          t={t}
          onAddProduct={addToCart}
          onRemoveProduct={removeFromCart}
          onCreateDeskCheckout={() => void createCheckout("DESK")}
          onShowDeskPaymentOption={() => setShowDeskPaymentOption(true)}
        />
      </ShopShell>
    );
  }

  const miniCart = (
    <ShopMiniCart
      itemCount={itemCount}
      totalPaise={totalPaise}
      t={t}
      onPress={() => router.push("/shop/cart" as never)}
    />
  );

  return (
    <ShopShell selectedPath="/shop" floatingAction={miniCart} refreshControl={refreshControl} noScroll={true}>
      <ShopBrowseGrid
        products={filteredProducts}
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        cartHydrated={cartHydrated}
        cart={cart}
        contentPaddingBottom={contentPaddingBottom}
        refreshControl={refreshControl}
        header={
          <ShopBrowseHeader
            activeCategory={category}
            cartHydrated={cartHydrated}
            categoryCounts={categoryCounts}
            contextSlot={locationContext}
            debouncedQuery={debouncedQuery}
            hasProductsError={productsQuery.isError}
            isProductsLoading={productsQuery.isLoading}
            pinnedOrder={pinnedOrder}
            query={query}
            t={t}
            visibleCategories={visibleCategories}
            onChangeQuery={setQuery}
            onOpenPinnedOrder={(orderId) => router.push(`/shop/pickup/${orderId}` as never)}
            onRetryProducts={() => void productsQuery.refetch()}
            onSelectCategory={setCategory}
          />
        }
        t={t}
        onAddProduct={addToCart}
        onRemoveProduct={removeFromCart}
      />
    </ShopShell>
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
  useHideBottomNav();
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = useBottomScrollPadding({
    hasStickyAction: Boolean(floatingAction || stickyAction),
  });
  const floatingBottom = Math.max(insets.bottom, 12) + 18;

  return (
    <>
      <ZookScreen testID={`shop-${selectedPath.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-screen`}>
        {noScroll ? (
          <View style={styles.noScrollContent}>
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
        {stickyAction ? <StickyActionBar bottomOffset={0}>{stickyAction}</StickyActionBar> : null}
      </ZookScreen>
    </>
  );
}
