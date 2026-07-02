import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Card, ListRow, MoneySummaryCard } from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import type { ShopCartItem } from "@/features/shop/shop-cart-section";
import { useTheme } from "@/lib/theme";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export function ShopCheckoutSection({
  cartItems,
  createOrderPending,
  itemCount,
  showDeskPaymentOption,
  totalPaise,
  t,
  onCreateDeskCheckout,
  onShowDeskPaymentOption,
}: {
  cartItems: ShopCartItem[];
  createOrderPending: boolean;
  itemCount: number;
  showDeskPaymentOption: boolean;
  totalPaise: number;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onCreateDeskCheckout: () => void;
  onShowDeskPaymentOption: () => void;
}) {
  const { palette } = useTheme();
  const checkoutDisabled = !cartItems.length || createOrderPending;

  return (
    <>
      <MoneySummaryCard
        title={t("shop.subtotal")}
        amount={formatInr(totalPaise)}
        rows={[
          {
            label: t("shop.itemsLabel"),
            value: t(itemCount === 1 ? "shop.itemCount" : "shop.itemsCount", {
              count: itemCount,
            }),
          },
          { label: t("shop.pickupLabel"), value: t("shop.availableAtGymDesk") },
        ]}
      />
      {showDeskPaymentOption ? (
        <Pressable
          testID="shop-pay-at-desk"
          accessibilityRole="button"
          accessibilityLabel={t("shop.payAtDesk")}
          disabled={checkoutDisabled}
          onPress={onCreateDeskCheckout}
          style={({ pressed }) => [
            styles.deskFallbackRow,
            {
              backgroundColor: palette.surface.default,
              borderColor: palette.border.subtle,
              opacity: checkoutDisabled ? 0.55 : 1,
            },
            pressed && !checkoutDisabled ? styles.deskFallbackRowPressed : null,
          ]}
        >
          <View style={[styles.deskFallbackIcon, { backgroundColor: palette.bg.sunken }]}>
            <Ionicons name="storefront-outline" size={16} color={palette.text.secondary} />
          </View>
          <View style={styles.deskFallbackCopy}>
            <Text style={[styles.deskFallbackTitle, { color: palette.text.primary }]}>
              {t("shop.payAtDeskInstead")}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.deskFallbackBody, { color: palette.text.secondary }]}
            >
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
          onPress={onShowDeskPaymentOption}
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
    </>
  );
}

function cartLineSubtitle(quantity: number, unitPaise: number) {
  return quantity > 1 ? `${quantity} × ${formatInr(unitPaise)}` : undefined;
}
