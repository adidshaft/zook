import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, Text, View } from "react-native";
import { formatInr } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export function ShopMiniCart({
  itemCount,
  totalPaise,
  t,
  onPress,
}: {
  itemCount: number;
  totalPaise: number;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onPress: () => void;
}) {
  const { mode, palette } = useTheme();
  if (itemCount <= 0) return null;

  return (
    <Pressable
      testID="shop-mini-cart"
      onPress={onPress}
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
  );
}
