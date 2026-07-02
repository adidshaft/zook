import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { Card, ListRow, ZookButton } from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { PickupQrCode } from "@/components/primitives/pickup-qr";
import { formatInr } from "@/lib/formatting";
import type { TranslationKey } from "@/lib/i18n";
import type { ShopProductRecord } from "@/lib/domains/shared/types";
import { useTheme } from "@/lib/theme";
import type { ShopCartItem } from "@/features/shop/shop-cart-section";
import { ShopBrowserReturnCard } from "@/features/shop/shop-browser-return-card";
import { shopStyles as styles } from "@/features/route-surfaces/shop-index-route.styles";

type PickupOrder = {
  id: string;
  status: string;
  pickupCode?: string | null;
  fulfilledAt?: string | Date | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitPaise: number;
    product?: ShopProductRecord | null;
  }>;
};

export function ShopPickupSection({
  cartItems,
  checkingCheckoutStatus,
  order,
  products,
  showBrowserReturn,
  t,
  onBackToShop,
  onCheckStatus,
  onCopyPickupCode,
}: {
  cartItems: ShopCartItem[];
  checkingCheckoutStatus: boolean;
  order: PickupOrder;
  products: ShopProductRecord[];
  showBrowserReturn: boolean;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  onBackToShop: () => void;
  onCheckStatus: () => void;
  onCopyPickupCode: () => void;
}) {
  const { mode, palette } = useTheme();
  const waitingForDeskPayment = order.status === "PENDING_PAYMENT" && !showBrowserReturn;
  const canShowPickupQr = order.status === "READY_FOR_PICKUP" || order.status === "FULFILLED";
  const awaitingDeskTone = getTonePalette("amber", mode, palette);
  const lineItems = order.items.length
    ? order.items
    : cartItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPaise: item.product.pricePaise,
        product: item.product,
      }));

  return (
    <>
      {showBrowserReturn ? (
        <ShopBrowserReturnCard
          checking={checkingCheckoutStatus}
          t={t}
          onCheckStatus={onCheckStatus}
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
            <Text style={[styles.pickupLabel, { color: palette.text.secondary }]}>
              {t("shop.pickupCode")}
            </Text>
            <Text numberOfLines={1} style={[styles.pickupCode, { color: palette.text.primary }]}>
              {order.pickupCode ?? t("shop.pending")}
            </Text>
          </View>
          <Pressable
            onPress={onCopyPickupCode}
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
            <Text style={[styles.pickupQrTitle, { color: palette.text.primary }]}>
              {t("shop.showThisToCollect")}
            </Text>
          </View>
          <PickupQrCode value={pickupQrPayload(order)} size={136} />
        </Card>
      ) : null}
      <Card variant="compact" contentStyle={styles.stack}>
        {lineItems.map((item) => {
          const product = item.product ?? products.find((candidate) => candidate.id === item.productId);
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
        onPress={onBackToShop}
        icon="bag-outline"
        variant="secondary"
      >
        {t("shop.backToShop")}
      </ZookButton>
    </>
  );
}

function pickupQrPayload(order: PickupOrder) {
  return JSON.stringify({
    type: "shop_pickup",
    orderId: order.id,
    code: order.pickupCode,
  });
}
