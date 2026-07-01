import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  type ScrollViewProps,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BranchSelectorChip,
  EmptyState,
  ErrorState,
  Card,
  ListRow,
  AppHeader,
  HeaderActions,
  MoneySummaryCard,
  ProductCard,
  SearchBar,
  Skeleton,
  StickyActionBar,
  ZookButton,
  ZookScreen,
  type PillTone,
} from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { formatDateTime, formatInr } from "@/lib/formatting";
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
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { PickupQrCode } from "@/components/primitives/pickup-qr";
import { getMobileApiMode } from "@/lib/runtime-mode";
import { shopStyles as styles } from "./shop-index-route.styles";

type Category = "ALL" | "WATER" | "PROTEIN_SHAKE" | "SHAKER" | "TOWEL" | "SUPPLEMENT" | "OTHER";
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

const categories: Array<{ labelKey: TranslationKey; value: Category }> = [
  { labelKey: "shop.categoryAll", value: "ALL" },
  { labelKey: "shop.categoryWater", value: "WATER" },
  { labelKey: "shop.categoryShake", value: "PROTEIN_SHAKE" },
  { labelKey: "shop.categoryCups", value: "SHAKER" },
  { labelKey: "shop.categoryTowel", value: "TOWEL" },
  { labelKey: "shop.categorySupplements", value: "SUPPLEMENT" },
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

function toneForCategory(category: Category): PillTone {
  if (category === "WATER") return "blue";
  if (category === "TOWEL") return "amber";
  if (category === "SHAKER") return "violet";
  if (category === "PROTEIN_SHAKE") return "lime";
  if (category === "SUPPLEMENT") return "violet";
  return "blue";
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

function orderActionCopy(order: ShopOrderRecord, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  const status = String(order.status ?? "").toUpperCase();
  if (status === "READY_FOR_PICKUP" || (order.pickupCode && !order.fulfilledAt)) {
    return order.pickupCode
      ? t("shop.orderReadyWithCode", { code: order.pickupCode })
      : t("shop.orderReady");
  }
  if (status === "PENDING_PAYMENT") return t("shop.orderNeedsPayment");
  if (status === "PROCESSING" || status === "PAID") return t("shop.orderBeingPrepared");
  if (status === "FULFILLED") return t("shop.orderPickedUp");
  if (status === "CANCELLED") return t("shop.orderCancelled");
  return formatDateTime(order.createdAt, t("shop.recently"), "en-IN");
}

function orderBannerTitle(order: ShopOrderRecord, t: (key: TranslationKey, values?: Record<string, string | number>) => string) {
  const status = String(order.status ?? "").toUpperCase();
  if (status === "READY_FOR_PICKUP" || (order.pickupCode && !order.fulfilledAt)) return t("shop.readyForPickup");
  if (status === "PENDING_PAYMENT") return t("shop.paymentPending");
  if (status === "PROCESSING" || status === "PAID") return t("shop.orderBeingPrepared");
  if (status === "FULFILLED") return t("shop.orderPickedUp");
  if (status === "CANCELLED") return t("shop.orderCancelled");
  return t("shop.orderHistory");
}

function cartLineSubtitle(quantity: number, unitPaise: number) {
  return quantity > 1 ? `${quantity} × ${formatInr(unitPaise)}` : undefined;
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
    qaBrowse?: string | string[];
  }>();
  const { activeOrgId, session, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const [category, setCategory] = useState<Category>("ALL");
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
  const visibleCategories = useMemo(
    () => categories.filter((option) => option.value === "ALL" || (categoryCounts[option.value] ?? 0) > 0),
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
    const canShowPickupQr = order.status === "READY_FOR_PICKUP" || order.status === "FULFILLED";
    const awaitingDeskTone = getTonePalette("amber", mode, palette);
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
        <AppHeader
          title={waitingForDeskPayment ? t("shop.paymentPending") : t("shop.readyForPickup")}
          subtitle={waitingForDeskPayment ? t("shop.payAtDeskSubtitle") : t("shop.readyForPickupSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        {waitingCheckoutSessionId ? (
          <BrowserReturnCard
            checking={checkingCheckoutStatus}
            onCheckStatus={() => void refreshShopCheckoutStatus()}
          />
        ) : null}
        {waitingForDeskPayment ? (
          <Card variant="compact" contentStyle={styles.deskPaymentContent}>
            <View
              accessible
              accessibilityLabel={t("shop.awaitingDeskPayment")}
              style={[
                styles.deskPaymentMark,
                {
                  borderColor: awaitingDeskTone.borderColor,
                  backgroundColor: awaitingDeskTone.backgroundColor,
                },
              ]}
            >
              <Ionicons name="time-outline" size={15} color={awaitingDeskTone.color} />
            </View>
            <Text numberOfLines={2} style={[styles.cardBody, { color: palette.text.secondary }]}>
              {t("shop.payAtDeskInstructions")}
            </Text>
          </Card>
        ) : null}
        <Card variant="compact" contentStyle={styles.pickupContent}>
          <View style={styles.pickupCodeRow}>
            <View style={styles.pickupCodeCopy}>
              <Text style={[styles.pickupLabel, { color: palette.text.secondary }]}>{t("shop.pickupCode")}</Text>
              <Text numberOfLines={1} style={[styles.pickupCode, { color: palette.text.primary }]}>
                {order.pickupCode ?? t("shop.pending")}
              </Text>
            </View>
            <Pressable
              onPress={() => void copyPickupCode()}
              accessibilityRole="button"
              accessibilityLabel={
                order.pickupCode
                  ? t("shop.copyPickupCodeAccessibility", { code: order.pickupCode })
                  : t("shop.pickupCodePending")
              }
              accessibilityState={{ disabled: !order.pickupCode }}
              disabled={!order.pickupCode}
              hitSlop={8}
              style={({ pressed }) => [
                styles.copyCodeButton,
                {
                  backgroundColor: palette.surface.accentSoft,
                  opacity: order.pickupCode ? 1 : 0.45,
                },
                pressed && order.pickupCode ? styles.copyCodeButtonPressed : null,
              ]}
            >
              <Ionicons name="copy-outline" size={17} color={palette.accent.strong} />
            </Pressable>
          </View>
        </Card>
        {canShowPickupQr ? (
          <Card variant="compact" contentStyle={styles.pickupQrContent}>
            <View style={styles.pickupQrHeader}>
              <Ionicons name="qr-code-outline" size={18} color={palette.accent.strong} />
              <Text style={[styles.pickupQrTitle, { color: palette.text.primary }]}>{t("shop.showThisToCollect")}</Text>
            </View>
            <PickupQrCode value={pickupQrPayload(order)} size={136} />
          </Card>
        ) : null}
        <Card variant="compact" contentStyle={styles.stack}>
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
              />
            );
          })}
        </Card>
        <ZookButton
          testID="shop-back-to-shop"
          onPress={() => {
            setOrder(null);
            router.replace("/shop" as never);
          }}
          icon="bag-outline"
          variant="secondary"
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
        <AppHeader
          title={t("shop.payment")}
          subtitle={t("shop.paymentSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        {waitingCheckoutSessionId ? (
          <BrowserReturnCard
            checking={checkingCheckoutStatus}
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
        <AppHeader
          title={t("shop.choosePaymentMethod")}
          subtitle={t("shop.choosePaymentMethodSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        <MoneySummaryCard
          title={t("shop.subtotal")}
          amount={formatInr(totalPaise)}
          rows={[
            { label: t("shop.itemsLabel"), value: t(itemCount === 1 ? "shop.itemCount" : "shop.itemsCount", { count: itemCount }) },
            { label: t("shop.pickupLabel"), value: t("shop.availableAtGymDesk") },
          ]}
        />
        {showDeskPaymentOption ? (
          <Pressable
            testID="shop-pay-at-desk"
            accessibilityRole="button"
            accessibilityLabel={t("shop.payAtDesk")}
            disabled={!cartItems.length || createOrder.isPending}
            onPress={() => void createCheckout("DESK")}
            style={({ pressed }) => [
              styles.deskFallbackRow,
              {
                backgroundColor: palette.surface.default,
                borderColor: palette.border.subtle,
                opacity: !cartItems.length || createOrder.isPending ? 0.55 : 1,
              },
              pressed && cartItems.length && !createOrder.isPending
                ? styles.deskFallbackRowPressed
                : null,
            ]}
          >
            <View style={[styles.deskFallbackIcon, { backgroundColor: palette.bg.sunken }]}>
              <Ionicons name="storefront-outline" size={16} color={palette.text.secondary} />
            </View>
            <View style={styles.deskFallbackCopy}>
              <Text style={[styles.deskFallbackTitle, { color: palette.text.primary }]}>
                {t("shop.payAtDeskInstead")}
              </Text>
              <Text numberOfLines={1} style={[styles.deskFallbackBody, { color: palette.text.secondary }]}>
                {t("shop.payAtDeskBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text.secondary} />
          </Pressable>
        ) : (
          <Pressable
            testID="shop-show-other-payment-options"
            accessibilityRole="button"
            accessibilityLabel={t("shop.otherPaymentOptions")}
            onPress={() => setShowDeskPaymentOption(true)}
            style={({ pressed }) => [
              styles.paymentDisclosureRow,
              {
                backgroundColor: palette.bg.sunken,
                borderColor: palette.border.subtle,
              },
              pressed ? styles.deskFallbackRowPressed : null,
            ]}
          >
            <Text style={[styles.paymentDisclosureText, { color: palette.text.secondary }]}>
              {t("shop.otherPaymentOptions")}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.text.secondary} />
          </Pressable>
        )}
        <Card contentStyle={styles.checkoutContent}>
          {cartItems.map((item) => (
            <ListRow
              key={item.product.id}
              title={item.product.name}
              subtitle={cartLineSubtitle(item.quantity, item.product.pricePaise)}
              trailing={
                <Text style={[styles.cartLinePrice, { color: palette.text.primary }]}>
                  {formatInr(item.product.pricePaise * item.quantity)}
                </Text>
              }
            />
          ))}
        </Card>
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
        <AppHeader
          title={t("shop.reviewOrder")}
          subtitle={t("shop.reviewOrderSubtitle")}
          leading={headerBackButton}
          contextSlot={locationContext}
          showProfileShortcut={false}
        />
        <Card variant="compact" contentStyle={styles.stack}>
          {cartItems.length ? (
            cartItems.map((item) => (
              <ListRow
                key={item.product.id}
                title={item.product.name}
                subtitle={cartLineSubtitle(item.quantity, item.product.pricePaise)}
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
                        accessibilityLabel={t("shop.removeProductAccessibility", { name: item.product.name })}
                        style={({ pressed }) => [
                          styles.cartStepperButton,
                          pressed ? styles.cartStepperButtonPressed : null,
                        ]}
                      >
                        <Ionicons name="remove" size={15} color={palette.accent.strong} />
                      </Pressable>
                      <Text style={[styles.cartQuantity, { color: palette.text.primary }]}>{item.quantity}</Text>
                      <Pressable
                        testID={`shop-cart-add-${item.product.id}`}
                        onPress={() => addToCart(item.product.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t("shop.addProductAccessibility", { name: item.product.name })}
                        disabled={item.quantity >= item.product.stock}
                        style={({ pressed }) => [
                          styles.cartStepperButton,
                          item.quantity >= item.product.stock ? styles.cartStepperDisabled : null,
                          pressed && item.quantity < item.product.stock
                            ? styles.cartStepperButtonPressed
                            : null,
                        ]}
                      >
                        <Ionicons
                          name="add"
                          size={15}
                          color={
                            item.quantity >= item.product.stock
                              ? palette.text.tertiary
                              : palette.accent.strong
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                }
              />
            ))
          ) : (
            <EmptyState icon="cart-outline" title={t("shop.yourCartEmpty")} />
          )}
        </Card>
        {cartItems.length && showDeskPaymentOption ? (
          <Pressable
            testID="shop-cart-pay-at-desk"
            accessibilityRole="button"
            accessibilityLabel={t("shop.payAtDeskInstead")}
            disabled={createOrder.isPending}
            onPress={() => void createCheckout("DESK")}
            style={({ pressed }) => [
              styles.deskFallbackRow,
              {
                backgroundColor: palette.surface.default,
                borderColor: palette.border.subtle,
                opacity: createOrder.isPending ? 0.55 : 1,
              },
              pressed && !createOrder.isPending ? styles.deskFallbackRowPressed : null,
            ]}
          >
            <View style={[styles.deskFallbackIcon, { backgroundColor: palette.bg.sunken }]}>
              <Ionicons name="storefront-outline" size={16} color={palette.text.secondary} />
            </View>
            <View style={styles.deskFallbackCopy}>
              <Text style={[styles.deskFallbackTitle, { color: palette.text.primary }]}>
                {t("shop.payAtDeskInstead")}
              </Text>
              <Text numberOfLines={1} style={[styles.deskFallbackBody, { color: palette.text.secondary }]}>
                {t("shop.payAtDeskBody")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.text.secondary} />
          </Pressable>
        ) : cartItems.length ? (
          <Pressable
            testID="shop-cart-show-other-payment-options"
            accessibilityRole="button"
            accessibilityLabel={t("shop.otherPaymentOptions")}
            onPress={() => setShowDeskPaymentOption(true)}
            style={({ pressed }) => [
              styles.paymentDisclosureRow,
              {
                backgroundColor: palette.bg.sunken,
                borderColor: palette.border.subtle,
              },
              pressed ? styles.deskFallbackRowPressed : null,
            ]}
          >
            <Text style={[styles.paymentDisclosureText, { color: palette.text.secondary }]}>
              {t("shop.otherPaymentOptions")}
            </Text>
            <Ionicons name="chevron-down" size={16} color={palette.text.secondary} />
          </Pressable>
        ) : null}
      </ShopShell>
    );
  }

  const miniCart =
    itemCount > 0 ? (
      <Pressable
        testID="shop-mini-cart"
        onPress={() => router.push("/shop/cart" as never)}
        accessibilityRole="button"
        accessibilityLabel={t("shop.openMiniCart")}
        style={[
          styles.miniCart,
          {
            backgroundColor: palette.accent.fill,
            shadowColor: palette.accent.base,
            shadowOpacity: Platform.OS === "ios" ? (mode === "dark" ? 0.2 : 0.1) : 0,
            elevation: Platform.OS === "android" ? 4 : 0,
          },
        ]}
      >
        {({ pressed }) => (
          <View style={[styles.miniCartReview, pressed ? styles.miniCartPressed : null]}>
            <View style={[styles.miniCartIcon, { backgroundColor: "rgba(0,0,0,0.14)" }]}>
              <Ionicons name="bag-handle-outline" size={18} color={palette.text.onAccent} />
            </View>
            <View style={styles.miniCartCopy}>
              <Text numberOfLines={1} style={[styles.miniCartText, { color: palette.text.onAccent }]}>
                {t("shop.cart")}
              </Text>
              <Text numberOfLines={1} style={[styles.miniCartMeta, { color: palette.text.onAccent }]}>
                {itemCount} {t(itemCount === 1 ? "shop.item" : "shop.items")} · {formatInr(totalPaise)}
              </Text>
            </View>
            <View style={styles.miniCartCta}>
              <Text numberOfLines={1} style={[styles.miniCartPayText, { color: palette.text.onAccent }]}>
                {t("shop.reviewOrder")}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={palette.text.onAccent} />
            </View>
          </View>
        )}
      </Pressable>
    ) : null;

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
                ? t("shop.onlyLeft", { count: item.stock })
                : t("shop.inStockCount", { count: item.stock })
              : t("shop.outOfStock");
          const productImageUrl = item.imageUrl ?? item.imageUrls?.[0] ?? null;
          return (
            <ProductCard
              testID={index === 0 ? "shop-product-first" : `shop-product-${item.id}`}
              name={item.name}
              price={formatInr(item.pricePaise)}
              stock={fulfillmentLabel}
              tone={
                item.stock <= 0
                  ? "red"
                  : lowStock
                    ? "amber"
                    : toneForCategory(item.category as Category)
              }
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
          <View style={styles.browseHeader}>
            <AppHeader
              title={t("shop.title")}
              subtitle={undefined}
              showProfileShortcut={false}
              contextSlot={locationContext}
              trailing={<HeaderActions showBell />}
            />

            <SearchBar value={query} onChangeText={setQuery} placeholder={t("shop.searchEssentials")} />

            <View style={styles.serviceStrip}>
              {!pinnedOrder ? (
                <View
                  style={[
                    styles.pickupPill,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.subtle,
                    },
                  ]}
                >
                  <Ionicons name="storefront-outline" size={14} color={palette.text.secondary} />
                  <Text
                    numberOfLines={1}
                    style={[styles.pickupPillText, { color: palette.text.secondary }]}
                  >
                    {t("shop.deskPickup")}
                  </Text>
                </View>
              ) : null}
              {pinnedOrder ? (
                <Pressable
                  testID="shop-active-order-banner"
                  accessibilityRole="button"
                  accessibilityLabel={`${orderBannerTitle(pinnedOrder, t)}: ${orderActionCopy(pinnedOrder, t)}`}
                  onPress={() => router.push(`/shop/pickup/${pinnedOrder.id}` as never)}
                  style={({ pressed }) => [
                    styles.activeOrderBanner,
                    {
                      backgroundColor: palette.surface.default,
                      borderColor: palette.border.subtle,
                    },
                    pressed ? styles.activeOrderBannerPressed : null,
                  ]}
                >
                  <Ionicons name="receipt-outline" size={15} color={palette.accent.base} />
                  <View style={styles.activeOrderCopy}>
                    <Text
                      numberOfLines={1}
                      style={[styles.activeOrderTitle, { color: palette.text.primary }]}
                    >
                      {orderBannerTitle(pinnedOrder, t)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.activeOrderMeta, { color: palette.text.secondary }]}
                    >
                      {orderActionCopy(pinnedOrder, t)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={palette.text.secondary} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRail}
              style={styles.categoryScroller}
            >
              {visibleCategories.map((option) => {
                const selected = option.value === category;
                const count = categoryCounts[option.value] ?? 0;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setCategory(option.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(option.labelKey)}, ${count}`}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        backgroundColor: selected
                          ? palette.accent.fill
                          : palette.surface.default,
                        borderColor: selected ? palette.accent.strong : palette.border.subtle,
                      },
                      pressed ? styles.categoryChipPressed : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.categoryIconBubble,
                        {
                          backgroundColor: selected
                            ? "rgba(0,0,0,0.14)"
                            : palette.bg.sunken,
                        },
                      ]}
                    >
                      <Ionicons
                        name={iconForCategory(option.value)}
                        size={14}
                        color={selected ? palette.text.onAccent : palette.text.secondary}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                      style={[
                        styles.categoryChipText,
                        {
                          color: selected ? palette.text.onAccent : palette.text.secondary,
                        },
                      ]}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!productsQuery.isError && (category !== "ALL" || debouncedQuery) ? (
              <View style={styles.inlineShelfHeader}>
                <Text style={[styles.inlineShelfTitle, { color: palette.text.primary }]}>
                  {debouncedQuery
                    ? t("shop.searchResults")
                    : t("shop.availableNow")}
                </Text>
              </View>
            ) : null}

            {productsQuery.isError ? (
              <Card variant="danger" contentStyle={styles.stateCardContent}>
                <ErrorState
                  title={t("shop.shopCouldNotLoad")}
                  body={t("shop.shopCouldNotLoadBody")}
                  action={
                    <ZookButton
                      onPress={() => void productsQuery.refetch()}
                      variant="secondary"
                      icon="refresh-outline"
                    >
                      {t("shop.tryAgain")}
                    </ZookButton>
                  }
                />
              </Card>
            ) : productsQuery.isLoading || !cartHydrated ? (
              <ShopSkeleton />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !productsQuery.isLoading && cartHydrated && !productsQuery.isError && !filteredProducts.length ? (
            <EmptyState icon="storefront-outline" title={t("shop.noProductsFound")} />
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
  const { t } = useI18n();
  return (
    <Card variant="compact" contentStyle={styles.browserReturnContent}>
      <Ionicons name="open-outline" size={22} color={palette.feedback.warning} />
      <View style={styles.browserReturnCopy}>
        <Text style={[styles.browserReturnTitle, { color: palette.text.primary }]}>
          {t("shop.continueInBrowser")}
        </Text>
        <Text style={[styles.browserReturnBody, { color: palette.text.secondary }]}>
          {t("shop.browserReturnBody")}
        </Text>
      </View>
      <ZookButton
        variant="secondary"
        disabled={checking}
        onPress={onCheckStatus}
        icon="refresh-outline"
      >
        {checking ? t("shop.checking") : t("shop.checkStatus")}
      </ZookButton>
    </Card>
  );
}

function ShopSkeleton() {
  return (
    <View style={styles.productGrid}>
      {[0, 1, 2, 3].map((item) => (
        <Card
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
        </Card>
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
