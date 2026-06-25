import { Alert, Text, View } from "react-native";

import { MetricGrid } from "@/components/domain/metric-grid";
import { Card, EmptyState, FormField, IconBubble, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { formatInr, titleCaseFromCode, toneForShopOrderStatus } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

export function ReceptionOrdersScreenBody() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const {
    canVerifyCode,
    fulfillOrder,
    fulfillOrderMutation,
    fulfilledCount,
    handleVerifyCodeChange,
    paymentStatus,
    readyOrders,
    verifyingCode,
    verifyCode,
    verifyEntryCode,
  } = useReceptionWorkspace();

  return (
    <>
            <MetricGrid
              items={[
                {
                  label: t("reception.orders.ready"),
                  value: readyOrders.length,
                  tone: "blue",
                  icon: "bag-check-outline",
                },
                {
                  label: t("reception.orders.done"),
                  value: fulfilledCount,
                  tone: "blue",
                  icon: "checkmark-done-outline",
                },
              ]}
            />
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
            <SectionHeader title={t("reception.orders.fulfillmentQueue")} />
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
                        <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                          {order.pickupCode ?? t("owner.stock.pickupPending")} · {formatInr(order.totalPaise)} ·{" "}
                          {t("reception.orders.itemCount", { count: order.items.length })}
                        </Text>
                      </View>
                      <Pill tone={toneForShopOrderStatus(order.status)}>
                        {titleCaseFromCode(order.status)}
                      </Pill>
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
                            <Text style={[styles.itemName, { color: palette.text.primary }]}>
                              {product?.name ?? item.productId}
                            </Text>
                            <Text style={[styles.itemMeta, { color: palette.text.secondary }]}>
                              x{item.quantity} · {formatInr(item.quantity * item.unitPaise)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <PrimaryButton
                      testID={index === 0 ? "fulfill-button-first" : `fulfill-button-${order.id}`}
                      icon="bag-check-outline"
                      disabled={fulfillOrderMutation.isPending}
                      onPress={() => {
                        Alert.alert(
                          t("reception.orders.confirmPickedUpTitle"),
                          t("reception.orders.confirmPickedUpBody", {
                            name: order.user?.name ?? t("reception.orders.thisMember"),
                            amount: formatInr(order.totalPaise),
                          }),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("reception.orders.markPickedUp"),
                              onPress: () => fulfillOrder(order.id),
                            },
                          ],
                        );
                      }}
                    >
                      {t("reception.orders.markPickedUp")}
                    </PrimaryButton>
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
    </>
  );
}
