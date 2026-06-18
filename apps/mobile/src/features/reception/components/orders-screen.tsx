import { Alert, Text, View } from "react-native";

import { MetricGrid } from "@/components/domain/metric-grid";
import { Card, EmptyState, FormField, IconBubble, Pill, PrimaryButton, SectionHeader } from "@/components/primitives";
import { formatInr, titleCaseFromCode, toneForShopOrderStatus } from "@/lib/formatting";
import { useTheme } from "@/lib/theme";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

export function ReceptionOrdersScreenBody() {
  const { palette } = useTheme();
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
                  label: "Ready",
                  value: readyOrders.length,
                  hint: "Pickup queue",
                  tone: "lime",
                  icon: "bag-check-outline",
                },
                {
                  label: "Done",
                  value: fulfilledCount,
                  hint: "Fulfilled",
                  tone: "blue",
                  icon: "checkmark-done-outline",
                },
              ]}
            />
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Pickup Verification"
                subtitle="Match the code and member before giving out the order."
              />
              <FormField
                testID="reception-pickup-code"
                label="Pickup code"
                value={verifyCode}
                onChangeText={handleVerifyCodeChange}
                autoCapitalize="characters"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => verifyEntryCode()}
                placeholder="Enter pickup code"
              />
              <PrimaryButton
                testID="reception-verify-pickup-code"
                icon="scan-outline"
                disabled={!canVerifyCode || verifyingCode}
                onPress={verifyEntryCode}
              >
                {verifyingCode ? "Verifying..." : "Verify Pickup Code"}
              </PrimaryButton>
            </Card>
            <SectionHeader title="Fulfillment Queue" subtitle="Paid orders ready at the desk." />
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
                      <IconBubble icon="bag-handle-outline" tone="lime" size={38} />
                      <View style={styles.queueCopy}>
                        <Text style={[styles.queueTitle, { color: palette.text.primary }]}>
                          {order.user?.name ?? "Member pickup"}
                        </Text>
                        <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                          {order.pickupCode ?? "Pickup pending"} · {formatInr(order.totalPaise)} ·{" "}
                          {order.items.length} items
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
                          "Mark order picked up?",
                          `${order.user?.name ?? "This member"} will be marked as collected for ${formatInr(order.totalPaise)}.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Mark picked up",
                              onPress: () => fulfillOrder(order.id),
                            },
                          ],
                        );
                      }}
                    >
                      Mark Picked Up
                    </PrimaryButton>
                  </Card>
                ))
              ) : (
                <EmptyState title="No pickups waiting" body="Ready orders will appear after payment." />
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
