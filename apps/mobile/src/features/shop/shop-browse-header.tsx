import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Card,
  ErrorState,
  HeaderActions,
  ScreenHeader,
  SearchBar,
  Skeleton,
  ZookButton,
  type PillTone,
} from "@/components/primitives";
import { formatDateTime } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import type { ShopOrderRecord } from "@/lib/domains/shared/types";
import { useTheme } from "@/lib/theme";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export type ShopCategory =
  | "ALL"
  | "WATER"
  | "PROTEIN_SHAKE"
  | "SHAKER"
  | "TOWEL"
  | "SUPPLEMENT"
  | "OTHER";

export const shopCategories: Array<{ labelKey: TranslationKey; value: ShopCategory }> = [
  { labelKey: "shop.categoryAll", value: "ALL" },
  { labelKey: "shop.categoryWater", value: "WATER" },
  { labelKey: "shop.categoryShake", value: "PROTEIN_SHAKE" },
  { labelKey: "shop.categoryCups", value: "SHAKER" },
  { labelKey: "shop.categoryTowel", value: "TOWEL" },
  { labelKey: "shop.categorySupplements", value: "SUPPLEMENT" },
];

export function iconForShopCategory(category: ShopCategory) {
  if (category === "WATER") return "water-outline" as const;
  if (category === "TOWEL") return "shirt-outline" as const;
  if (category === "SHAKER") return "flask-outline" as const;
  return "nutrition-outline" as const;
}

export function toneForShopCategory(category: ShopCategory): PillTone {
  if (category === "WATER") return "blue";
  if (category === "TOWEL") return "amber";
  if (category === "SHAKER") return "violet";
  if (category === "PROTEIN_SHAKE") return "lime";
  if (category === "SUPPLEMENT") return "violet";
  return "blue";
}

export function ShopBrowseHeader({
  activeCategory,
  cartHydrated,
  categoryCounts,
  contextSlot,
  debouncedQuery,
  hasProductsError,
  isProductsLoading,
  pinnedOrder,
  query,
  t,
  visibleCategories,
  onChangeQuery,
  onOpenPinnedOrder,
  onRetryProducts,
  onSelectCategory,
}: {
  activeCategory: ShopCategory;
  cartHydrated: boolean;
  categoryCounts: Record<ShopCategory, number>;
  contextSlot: React.ReactNode;
  debouncedQuery: string;
  hasProductsError: boolean;
  isProductsLoading: boolean;
  pinnedOrder?: ShopOrderRecord | null;
  query: string;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  visibleCategories: Array<{ labelKey: TranslationKey; value: ShopCategory }>;
  onChangeQuery: (value: string) => void;
  onOpenPinnedOrder: (orderId: string) => void;
  onRetryProducts: () => void;
  onSelectCategory: (category: ShopCategory) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.browseHeader}>
      <ScreenHeader
        title={t("shop.title")}
        subtitle={undefined}
        showProfileShortcut={false}
        contextSlot={contextSlot}
        trailing={<HeaderActions showBell />}
      />

      <SearchBar value={query} onChangeText={onChangeQuery} placeholder={t("shop.searchEssentials")} />

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
            <Text numberOfLines={1} style={[styles.pickupPillText, { color: palette.text.secondary }]}>
              {t("shop.deskPickup")}
            </Text>
          </View>
        ) : null}
        {pinnedOrder ? (
          <Pressable
            testID="shop-active-order-banner"
            accessibilityRole="button"
            accessibilityLabel={`${orderBannerTitle(pinnedOrder, t)}: ${orderActionCopy(pinnedOrder, t)}`}
            onPress={() => onOpenPinnedOrder(pinnedOrder.id)}
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
              <Text numberOfLines={1} style={[styles.activeOrderTitle, { color: palette.text.primary }]}>
                {orderBannerTitle(pinnedOrder, t)}
              </Text>
              <Text numberOfLines={1} style={[styles.activeOrderMeta, { color: palette.text.secondary }]}>
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
          const selected = option.value === activeCategory;
          const count = categoryCounts[option.value] ?? 0;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelectCategory(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`${t(option.labelKey)}, ${count}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor: selected ? palette.accent.fill : palette.surface.default,
                  borderColor: selected ? palette.accent.strong : palette.border.subtle,
                },
                pressed ? styles.categoryChipPressed : null,
              ]}
            >
              <View
                style={[
                  styles.categoryIconBubble,
                  {
                    backgroundColor: selected ? "rgba(0,0,0,0.14)" : palette.bg.sunken,
                  },
                ]}
              >
                <Ionicons
                  name={iconForShopCategory(option.value)}
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

      {!hasProductsError && (activeCategory !== "ALL" || debouncedQuery) ? (
        <View style={styles.inlineShelfHeader}>
          <Text style={[styles.inlineShelfTitle, { color: palette.text.primary }]}>
            {debouncedQuery ? t("shop.searchResults") : t("shop.availableNow")}
          </Text>
        </View>
      ) : null}

      {hasProductsError ? (
        <Card variant="danger" contentStyle={styles.stateCardContent}>
          <ErrorState
            title={t("shop.shopCouldNotLoad")}
            body={t("shop.shopCouldNotLoadBody")}
            action={
              <ZookButton onPress={onRetryProducts} variant="secondary" icon="refresh-outline">
                {t("shop.tryAgain")}
              </ZookButton>
            }
          />
        </Card>
      ) : isProductsLoading || !cartHydrated ? (
        <ShopSkeleton />
      ) : null}
    </View>
  );
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
