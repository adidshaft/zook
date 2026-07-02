import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Card, EmptyState, FormField, IconBubble, Pill, PrimaryButton, SectionHeader, useConfirmSheet } from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { formatInr, titleCaseFromCode, toneForShopOrderStatus } from "@/lib/formatting";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

const orderStatusLabelKeys: Record<string, TranslationKey> = {
  CANCELLED: "reception.orders.statusCancelled",
  FAILED: "reception.orders.statusFailed",
  FULFILLED: "reception.orders.statusFulfilled",
  PAID: "reception.orders.statusPaid",
  PENDING_PAYMENT: "reception.orders.statusPendingPayment",
  READY_FOR_PICKUP: "shop.readyForPickup",
  REFUNDED: "reception.orders.statusRefunded",
};

function orderStatusLabel(status: string | null | undefined, t: ReturnType<typeof useI18n>["t"]) {
  const normalized = (status ?? "READY_FOR_PICKUP").toUpperCase();
  const labelKey = orderStatusLabelKeys[normalized];
  return labelKey ? t(labelKey) : titleCaseFromCode(status ?? "READY_FOR_PICKUP");
}

function orderMetaChips(
  order: { pickupCode?: string | null; totalPaise: number; items: Array<unknown> },
  t: ReturnType<typeof useI18n>["t"],
) {
  return [
    {
      icon: "ticket-outline" as const,
      label: order.pickupCode ?? t("owner.stock.pickupPending"),
    },
    {
      icon: "cash-outline" as const,
      label: formatInr(order.totalPaise),
    },
    {
      icon: "cube-outline" as const,
      label: t("reception.orders.itemCount", { count: order.items.length }),
    },
  ];
}

export function ReceptionOrdersScreenBody() {
  const { mode, palette } = useTheme();
  const { t } = useI18n();
  const { confirm, sheet } = useConfirmSheet();
  const {
    canVerifyCode,
    fulfillOrder,
    fulfillOrderMutation,
    handleVerifyCodeChange,
    paymentStatus,
    readyOrders,
    verifyingCode,
    verifyCode,
    verifyEntryCode,
  } = useReceptionWorkspace();

  return (
    <>
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title={t("reception.orders.pickupVerification")}
                subtitle={t("reception.orders.pickupVerificationBody")}
              />
              <FormField
                testID="reception-pickup-code"
                label={t("reception.orders.pickupCode")}
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                autoCapitalize="characters"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => verifyEntryCode()}
                placeholder={t("reception.orders.enterPickupCode")}
              />
              <PrimaryButton
                testID="reception-verify-pickup-code"
                icon="scan-outline"
                disabled={!canVerifyCode || verifyingCode}
                onPress={verifyEntryCode}
              >
                {verifyingCode ? t("reception.desk.verifying") : t("reception.orders.verifyPickupCode")}
              </PrimaryButton>
            </Card>
            <SectionHeader
              title={t("reception.orders.fulfillmentQueue")}
              action={<Pill tone={readyOrders.length ? "blue" : "neutral"}>{readyOrders.length}</Pill>}
            />
            <View style={styles.stack}>
              {readyOrders.length ? (
                readyOrders.map((order, index) => (
                  <Card
                    testID={
                      index === 0 ? "reception-order-row-first" : `reception-order-row-${order.id}`
                    }
                    key={order.id}
                    variant="compact"
                    padding={14}
                    contentStyle={styles.queueCard}
                  >
                    <View style={styles.queueHeader}>
                      <IconBubble icon="bag-handle-outline" tone={toneForShopOrderStatus(order.status)} size={38} />
                      <View style={styles.queueCopy}>
                        <Text style={[styles.queueTitle, { color: palette.text.primary }]}>
                          {order.user?.name ?? t("owner.stock.memberPickup")}
                        </Text>
                        <View style={styles.orderMetaChips}>
                          {orderMetaChips(order, t).map((item) => (
                            <View
                              key={`${order.id}-${item.icon}`}
                              style={[
                                styles.orderMetaChip,
                                {
                                  borderColor: palette.border.subtle,
                                  backgroundColor: palette.surface.raised,
                                },
                              ]}
                            >
                              <Ionicons name={item.icon} size={12} color={palette.text.tertiary} />
                              <Text
                                numberOfLines={1}
                                style={[styles.orderMetaText, { color: palette.text.secondary }]}
                              >
                                {item.label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={styles.orderHeaderActions}>
                        <OrderStatusMark
                          colorMode={mode}
                          label={orderStatusLabel(order.status, t)}
                          status={order.status}
                          palette={palette}
                        />
                        <Pressable
                          testID={index === 0 ? "fulfill-button-first" : `fulfill-button-${order.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={t("reception.orders.markPickedUp")}
                          disabled={fulfillOrderMutation.isPending}
                          onPress={() => {
                            confirm({
                              title: t("reception.orders.confirmPickedUpTitle"),
                              body: t("reception.orders.confirmPickedUpBody", {
                                name: order.user?.name ?? t("reception.orders.thisMember"),
                                amount: formatInr(order.totalPaise),
                              }),
                              destructiveLabel: t("reception.orders.markPickedUp"),
                              cancelLabel: t("common.cancel"),
                              onConfirm: () => fulfillOrder(order.id),
                            });
                          }}
                          style={({ pressed }) => [
                            styles.pickupCompleteAction,
                            {
                              borderColor: palette.border.default,
                              backgroundColor: palette.surface.raised,
                            },
                            fulfillOrderMutation.isPending ? styles.pickupCompleteActionDisabled : null,
                            pressed && !fulfillOrderMutation.isPending
                              ? styles.pickupCompleteActionPressed
                              : null,
                          ]}
                        >
                          <Ionicons
                            name="bag-check-outline"
                            size={18}
                            color={palette.text.primary}
                          />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.itemGrid}>
                      {order.items.map((item) => {
                        const product = item.product;
                        return (
                          <View
                            key={item.productId}
                            style={[
                              styles.itemPill,
                              {
                                borderColor: palette.border.subtle,
                                backgroundColor: palette.surface.raised,
                              },
                            ]}
                          >
                            <Text numberOfLines={1} style={[styles.itemName, { color: palette.text.primary }]}>
                              {product?.name ?? item.productId}
                            </Text>
                            <Text style={[styles.itemMeta, { color: palette.text.secondary }]}>
                              x{item.quantity}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Card>
                ))
              ) : (
                <EmptyState icon="bag-handle-outline" title={t("owner.stock.noPickups")} body={t("reception.orders.noPickupsBody")} />
              )}
            </View>
            {paymentStatus ? (
              <Text
                testID="reception-payment-status"
                style={[styles.statusText, { color: palette.accent.base }]}
              >
                {paymentStatus}
              </Text>
            ) : null}
            {sheet}
    </>
  );
}

function OrderStatusMark({
  colorMode,
  label,
  palette,
  status,
}: {
  colorMode: "light" | "dark";
  label: string;
  palette: ReturnType<typeof useTheme>["palette"];
  status?: string | null;
}) {
  const tone = toneForShopOrderStatus(status);
  const tonePalette = getTonePalette(tone, colorMode, palette);
  const normalized = String(status ?? "").toUpperCase();
  const icon: keyof typeof Ionicons.glyphMap =
    normalized === "FULFILLED"
      ? "checkmark"
      : normalized === "PENDING_PAYMENT"
        ? "time-outline"
        : normalized.includes("FAIL") || normalized.includes("CANCEL")
          ? "alert-circle-outline"
          : "bag-handle-outline";

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.orderStatusMark,
        {
          borderColor: tonePalette.borderColor,
          backgroundColor: tonePalette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={tonePalette.color} />
    </View>
  );
}
