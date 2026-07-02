import type { ReactElement } from "react";
import { FlatList, type RefreshControlProps } from "react-native";
import { EmptyState, ProductCard } from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import type { ShopProductRecord } from "@/lib/domains/shared/types";
import {
  iconForShopCategory,
  toneForShopCategory,
  type ShopCategory,
} from "@/features/shop/shop-browse-header";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export function ShopBrowseGrid({
  products,
  isLoading,
  isError,
  cartHydrated,
  cart,
  contentPaddingBottom,
  refreshControl,
  header,
  t,
  onAddProduct,
  onRemoveProduct,
}: {
  products: ShopProductRecord[];
  isLoading: boolean;
  isError: boolean;
  cartHydrated: boolean;
  cart: Record<string, number>;
  contentPaddingBottom: number;
  refreshControl: ReactElement<RefreshControlProps>;
  header: ReactElement;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onAddProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
}) {
  return (
    <FlatList
      data={isLoading || !cartHydrated || isError ? [] : products}
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
                  : toneForShopCategory(item.category as ShopCategory)
            }
            imageUrl={productImageUrl}
            quantity={cart[item.id] ?? 0}
            icon={iconForShopCategory(item.category as ShopCategory)}
            compact
            disabled={item.stock <= 0}
            incrementDisabled={(cart[item.id] ?? 0) >= item.stock}
            onIncrement={() => onAddProduct(item.id)}
            onDecrement={() => onRemoveProduct(item.id)}
            style={styles.productCard}
          />
        );
      }}
      columnWrapperStyle={styles.columnWrapper}
      ListHeaderComponent={header}
      ListEmptyComponent={
        !isLoading && cartHydrated && !isError && !products.length ? (
          <EmptyState icon="storefront-outline" title={t("shop.noProductsFound")} />
        ) : null
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      refreshControl={refreshControl}
    />
  );
}
