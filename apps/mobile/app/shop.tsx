import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Card, Dock, Pill, PrimaryButton, Screen, Skeleton } from "@/components/primitives";
import { mobileApiFetch, toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatInr } from "@/lib/formatting";
import { useMyShopOrders, useShopProducts } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

type Product = {
  id: string;
  name: string;
  pricePaise: number;
  stock: number;
  category?: string;
  imageUrl?: string | null;
};

const shopCategories = [
  { key: "ALL", label: "All", icon: "grid-outline" },
  { key: "PROTEIN_SHAKE", label: "Protein", icon: "nutrition-outline" },
  { key: "SUPPLEMENT", label: "Snacks", icon: "fast-food-outline" },
  { key: "WATER", label: "Drinks", icon: "water-outline" },
  { key: "SHAKER", label: "Gear", icon: "barbell-outline" },
  { key: "OTHER", label: "Other", icon: "albums-outline" },
] as const;

const sampleProducts: Product[] = [
  {
    id: "sample-protein-chips",
    name: "RiteBite Max Protein Chips",
    pricePaise: 11900,
    stock: 6,
    category: "SUPPLEMENT",
    imageUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?q=80&w=500&h=500&fit=crop",
  },
  {
    id: "sample-shake",
    name: "Cold Coffee Protein Shake",
    pricePaise: 14900,
    stock: 10,
    category: "PROTEIN_SHAKE",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=500&h=500&fit=crop",
  },
  {
    id: "sample-water",
    name: "Electrolyte Water",
    pricePaise: 6000,
    stock: 18,
    category: "WATER",
    imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=500&h=500&fit=crop",
  },
  {
    id: "sample-shaker",
    name: "Zook Training Shaker",
    pricePaise: 29900,
    stock: 4,
    category: "SHAKER",
    imageUrl: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=500&h=500&fit=crop",
  },
];

const imageFallbacks: Record<string, string> = {
  SUPPLEMENT: "https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=500&h=500&fit=crop",
  PROTEIN_SHAKE: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&h=500&fit=crop",
  WATER: "https://images.unsplash.com/photo-1564419320461-6870880221ad?q=80&w=500&h=500&fit=crop",
  SHAKER: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=500&h=500&fit=crop",
  DEFAULT: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=500&h=500&fit=crop",
};

export default function Shop() {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const routeParams = useLocalSearchParams<{ focus?: string; notificationId?: string; orderId?: string }>();
  const { activeOrgId, token } = useAuth();
  const productsQuery = useShopProducts();
  const ordersQuery = useMyShopOrders();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<(typeof shopCategories)[number]["key"]>("ALL");
  const orders = (ordersQuery.data?.orders ?? []) as Array<{
    id: string;
    pickupCode?: string | null;
    status?: string | null;
    createdAt?: string | null;
  }>;
  const latestOrder = orders[0];
  const products = ((productsQuery.data?.products ?? []) as Product[]).length
    ? ((productsQuery.data?.products ?? []) as Product[])
    : sampleProducts;
  const filteredProducts = useMemo(
    () => products.filter((product) => activeCategory === "ALL" || product.category === activeCategory),
    [activeCategory, products],
  );
  const tileWidth = Math.max(132, Math.floor((width - 116) / 2));

  function getProductImage(product: Product) {
    if (product.imageUrl) return product.imageUrl;
    return imageFallbacks[product.category ?? ""] ?? imageFallbacks.DEFAULT;
  }

  async function buyProduct(productId: string) {
    if (!token || !activeOrgId || productId.startsWith("sample-")) {
      return;
    }
    try {
      setBusyId(productId);
      const payload = await mobileApiFetch<{ checkoutUrl: string }>("/shop/orders", {
        method: "POST",
        token,
        body: {
          orgId: activeOrgId,
          items: [{ productId, quantity: 1 }]
        }
      });
      await Linking.openURL(toWebUrl(payload.checkoutUrl));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products", activeOrgId] })
      ]);
    } finally {
      setBusyId(null);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["shop", "products", activeOrgId] })
    ]);
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        <Card style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Gym shop</Text>
              <Text style={styles.heroTitle}>Fuel, gear, pickup.</Text>
              <Text style={styles.heroBody}>Order in app, collect at the counter after training.</Text>
            </View>
            <View style={styles.orderBadge}>
              <Ionicons name="bag-check" size={22} color={colors.bg} />
            </View>
          </View>
          <View style={styles.pickupRow}>
            <Pill tone={latestOrder?.pickupCode ? "lime" : "neutral"}>
              {latestOrder?.pickupCode ? `Pickup ${latestOrder.pickupCode}` : "No pickup"}
            </Pill>
            {routeParams.focus === "shop-order" ? <Pill tone="blue">From notification</Pill> : null}
          </View>
        </Card>

        <View style={styles.browseShell}>
          <View style={styles.categoryRail}>
            {shopCategories.map((category) => {
              const active = activeCategory === category.key;
              return (
                <Pressable
                  key={category.key}
                  onPress={() => setActiveCategory(category.key)}
                  style={[styles.categoryButton, active ? styles.categoryButtonActive : null]}
                  accessibilityRole="button"
                >
                  <Ionicons name={category.icon} size={20} color={active ? colors.bg : colors.muted} />
                  <Text style={[styles.categoryText, active ? styles.categoryTextActive : null]} numberOfLines={2}>
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.productPane}>
            <View style={styles.filterBar}>
              <Pill tone="neutral">Filters</Pill>
              <Pill tone="neutral">Sort</Pill>
              <Pill tone="lime">{filteredProducts.length} items</Pill>
            </View>

            {productsQuery.isLoading ? (
              <View style={styles.productGrid}>
                {[1, 2, 3, 4].map((item) => (
                  <Card key={item} style={[styles.productCard, { width: tileWidth }]}>
                    <Skeleton width="100%" height={112} borderRadius={18} />
                    <Skeleton width="84%" height={16} />
                    <Skeleton width="56%" height={14} />
                  </Card>
                ))}
              </View>
            ) : (
              <View style={styles.productGrid}>
                {filteredProducts.map((product, index) => (
                  <Card key={product.id} style={[styles.productCard, { width: tileWidth }]}>
                    <View style={styles.productImageWrap}>
                      <Image source={{ uri: getProductImage(product) }} style={styles.productImage} contentFit="cover" />
                      <View style={styles.productBadge}>
                        <Text style={styles.productBadgeText}>{index % 2 === 0 ? "Bought earlier" : "Gym pick"}</Text>
                      </View>
                    </View>
                    <Text style={styles.priceText}>{formatInr(product.pricePaise)}</Text>
                    <Text style={styles.productName} numberOfLines={3}>
                      {product.name}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color={colors.amber} />
                      <Text style={styles.ratingText}>4.{(index + 4) % 10} · {product.stock} left</Text>
                    </View>
                    <PrimaryButton
                      onPress={() => void buyProduct(product.id)}
                      style={styles.addButton}
                      textStyle={styles.addButtonText}
                      disabled={busyId === product.id}
                    >
                      {busyId === product.id ? "..." : "ADD"}
                    </PrimaryButton>
                  </Card>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 14,
    gap: 14,
    paddingBottom: 120,
  },
  heroCard: {
    gap: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  kicker: {
    color: colors.amber,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 35,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  orderBadge: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  pickupRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  browseShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  categoryRail: {
    width: 72,
    gap: 10,
  },
  categoryButton: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    gap: 5,
  },
  categoryButtonActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  categoryText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    fontWeight: "800",
    lineHeight: 12,
  },
  categoryTextActive: {
    color: colors.bg,
  },
  productPane: {
    flex: 1,
    gap: 12,
  },
  filterBar: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  productCard: {
    padding: 10,
    gap: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.075)",
  },
  productImageWrap: {
    height: 118,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    borderRadius: 999,
    backgroundColor: "rgba(13,148,136,0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  productBadgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  priceText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  productName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    minHeight: 48,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  addButton: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  addButtonText: {
    fontSize: 12,
    lineHeight: 15,
  },
});
