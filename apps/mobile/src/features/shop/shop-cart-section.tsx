import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Card, EmptyState, ListRow } from "@/components/primitives";
import { formatInr } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import type { ShopProductRecord } from "@/lib/domains/shared/types";
import { useTheme } from "@/lib/theme";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

export type ShopCartItem = {
  product: ShopProductRecord;
  quantity: number;
};

export function ShopCartSection({
  cartItems,
  createOrderPending,
  showDeskPaymentOption,
  t,
  onAddProduct,
  onRemoveProduct,
  onCreateDeskCheckout,
  onShowDeskPaymentOption,
}: {
  cartItems: ShopCartItem[];
  createOrderPending: boolean;
  showDeskPaymentOption: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onAddProduct: (productId: string) => void;
  onRemoveProduct: (productId: string) => void;
  onCreateDeskCheckout: () => void;
  onShowDeskPaymentOption: () => void;
}) {
  const { palette } = useTheme();

  return (
    <>
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
                  <View
                    style={[
                      styles.cartStepper,
                      {
                        borderColor: palette.border.subtle,
                        backgroundColor: palette.bg.sunken,
                      },
                    ]}
                  >
                    <Pressable
                      testID={`shop-cart-remove-${item.product.id}`}
                      onPress={() => onRemoveProduct(item.product.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t("shop.removeProductAccessibility", {
                        name: item.product.name,
                      })}
                      style={({ pressed }) => [
                        styles.cartStepperButton,
                        pressed ? styles.cartStepperButtonPressed : null,
                      ]}
                    >
                      <Ionicons name="remove" size={15} color={palette.accent.strong} />
                    </Pressable>
                    <Text style={[styles.cartQuantity, { color: palette.text.primary }]}>
                      {item.quantity}
                    </Text>
                    <Pressable
                      testID={`shop-cart-add-${item.product.id}`}
                      onPress={() => onAddProduct(item.product.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t("shop.addProductAccessibility", {
                        name: item.product.name,
                      })}
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
          disabled={createOrderPending}
          onPress={onCreateDeskCheckout}
          style={({ pressed }) => [
            styles.deskFallbackRow,
            {
              backgroundColor: palette.surface.default,
              borderColor: palette.border.subtle,
              opacity: createOrderPending ? 0.55 : 1,
            },
            pressed && !createOrderPending ? styles.deskFallbackRowPressed : null,
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
      ) : cartItems.length ? (
        <Pressable
          testID="shop-cart-show-other-payment-options"
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
      ) : null}
    </>
  );
}

function cartLineSubtitle(quantity: number, unitPaise: number) {
  return quantity > 1 ? `${quantity} × ${formatInr(unitPaise)}` : undefined;
}
