import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MetricGrid } from "@/components/domain/metric-grid";
import { toneForStatus } from "@/components/membership/helpers";
import { AuditWarning, Card, FormField, IconBubble, ListRow, MoneySummaryCard, Pill, PrimaryButton, SearchField, SectionHeader } from "@/components/primitives";
import { formatInr, normalizeRupeeInput, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { type DeskPaymentMode, paymentModes } from "../constants";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

const paymentModeLabelKeys: Record<DeskPaymentMode, TranslationKey> = {
  BANK_TRANSFER: "reception.payments.modeBank",
  CARD: "reception.payments.modeCard",
  CASH: "reception.payments.modeCash",
  DIRECT_UPI: "reception.payments.modeUpi",
  OTHER: "reception.payments.modeManual",
};

export function ReceptionPaymentsScreenBody() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const {
    amount,
    amountInvalid,
    canRecordOfflinePayment,
    canRecordPayment,
    dueAmount,
    member,
    memberRecord,
    membersQuery,
    membership,
    paymentMemberSearch,
    paymentMode,
    paymentNote,
    paymentReason,
    paymentStatus,
    recordPayment,
    recordPaymentMutation,
    referenceId,
    setAmount,
    setPaymentMemberSearch,
    setPaymentMode,
    setPaymentNote,
    setPaymentReason,
    setReferenceId,
    setSelectedMemberId,
    showOwnerApprovalRequired,
  } = useReceptionWorkspace();
  const selectedPaymentModeLabel = t(paymentModeLabelKeys[paymentMode] ?? "reception.payments.modeManual");

  return (
    <>
            <MetricGrid
              items={[
                {
                  label: t("reception.payments.amount"),
                  value: formatInr(dueAmount),
                  tone: "neutral",
                  icon: "receipt-outline",
                },
                {
                  label: t("reception.payments.mode"),
                  value: selectedPaymentModeLabel,
                  tone: "blue",
                  icon: "reader-outline",
                },
              ]}
            />
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <FormField
                testID="reception-payment-amount"
                label={t("reception.payments.amountReceived")}
                value={amount}
                onChangeText={(value) => setAmount(normalizeRupeeInput(value))}
                keyboardType="numeric"
                placeholder="₹0"
                leading={<Text style={{ color: palette.text.tertiary }}>₹</Text>}
                returnKeyType="next"
                required
                error={amountInvalid ? t("reception.payments.amountInvalid") : undefined}
              />
            </Card>
            <MoneySummaryCard
              title={t("reception.payments.reviewTitle")}
              amount={formatInr(Number.parseFloat(amount || "0") * 100 || dueAmount)}
              rows={[
                { label: t("reception.members.memberTitle"), value: member?.name ?? t("reception.payments.selectMember") },
                { label: t("reception.payments.due"), value: formatInr(dueAmount) },
                {
                  label: t("reception.payments.mode"),
                  value: selectedPaymentModeLabel,
                },
                { label: t("reception.payments.desk"), value: memberRecord ? t("reception.payments.activeDesk") : t("reception.payments.selectMemberFirst") },
              ]}
              consequence={t("reception.payments.reviewConsequence")}
            />
            {!memberRecord ? (
              <Card variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader title={t("reception.payments.findMember")} />
                <SearchField
                  testID="reception-payment-member-search"
                  value={paymentMemberSearch}
                  onChangeText={setPaymentMemberSearch}
                  placeholder={t("reception.payments.searchPlaceholder")}
                />
                {paymentMemberSearch.trim().length >= 2 ? (
                  <View style={styles.stack}>
                    {(membersQuery.data?.members ?? [])
                      .filter((record) => {
                        const term = paymentMemberSearch.toLowerCase();
                        const name = record.user?.name?.toLowerCase() ?? "";
                        const email = record.user?.email?.toLowerCase() ?? "";
                        const phone = record.user?.phone?.toLowerCase() ?? "";
                        return name.includes(term) || email.includes(term) || phone.includes(term);
                      })
                      .slice(0, 8)
                      .map((record) => (
                        <Pressable
                          key={record.profile.userId}
                          onPress={() => {
                            setSelectedMemberId(record.profile.userId);
                            setPaymentMemberSearch("");
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t("reception.payments.selectMemberAccessibility", { name: record.user?.name ?? t("reception.orders.thisMember") })}
                          style={({ pressed }) => [
                            styles.paymentPersonRow,
                            {
                              borderColor: palette.border.default,
                              backgroundColor: palette.surface.raised,
                            },
                            pressed ? styles.paymentPersonRowPressed : null,
                          ]}
                        >
                          <IconBubble icon="person-outline" tone="neutral" size={32} />
                          <View style={styles.paymentMemberCopy}>
                            <Text
                              numberOfLines={1}
                              style={[styles.paymentMemberName, { color: palette.text.primary }]}
                            >
                              {record.user?.name ?? t("reception.members.memberTitle")}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.paymentMemberMeta, { color: palette.text.secondary }]}
                            >
                              {record.user?.email ?? record.user?.phone ?? t("reception.payments.noContact")}
                            </Text>
                          </View>
                          <Pill
                            tone={
                              record.activeSubscription
                                ? toneForStatus(record.activeSubscription.status)
                                : "amber"
                            }
                          >
                            {record.activeSubscription
                              ? titleCaseFromCode(record.activeSubscription.status)
                              : t("reception.payments.noPlan")}
                          </Pill>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </Card>
            ) : null}
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader title={t("reception.payments.collection")} />
              <ListRow
                title={t("reception.members.memberTitle")}
                subtitle={member?.name ?? t("reception.payments.selectMember")}
                leading={<IconBubble icon="person-outline" tone="neutral" size={38} />}
                trailing={
                  <Pill tone={member ? "lime" : "amber"}>{member ? t("reception.payments.verified") : t("reception.payments.missing")}</Pill>
                }
              />
              <ListRow
                title={t("reception.payments.invoice")}
                subtitle={
                  membership?.status
                    ? t("reception.payments.membershipSelected", { status: titleCaseFromCode(membership.status) })
                    : t("reception.payments.noMembershipSelected")
                }
                leading={<IconBubble icon="document-text-outline" tone="neutral" size={38} />}
                trailing={
                  <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                    {t("reception.payments.dueAmount", { amount: formatInr(dueAmount) })}
                  </Text>
                }
              />
              <View style={styles.formStack}>
                <Text style={[styles.fieldGroupLabel, { color: palette.text.tertiary }]}>
                  {t("reception.payments.collectionMode")}
                </Text>
                <View style={styles.paymentModeGrid}>
                  {paymentModes.map((mode) => {
                    const selected = mode.value === paymentMode;
                    return (
                      <Pressable
                        key={mode.value}
                        onPress={() => setPaymentMode(mode.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [
                          styles.paymentModeTile,
                          {
                            borderColor: selected ? palette.border.focus : palette.border.default,
                            backgroundColor: selected
                              ? palette.surface.accentSoft
                              : palette.surface.raised,
                          },
                          pressed ? styles.paymentModeTilePressed : null,
                        ]}
                      >
                        <Ionicons
                          name={
                            mode.value === "CASH"
                              ? "cash-outline"
                              : mode.value === "DIRECT_UPI"
                                ? "arrow-up-outline"
                                : mode.value === "BANK_TRANSFER"
                                  ? "business-outline"
                                  : mode.value === "CARD"
                                    ? "card-outline"
                                    : "create-outline"
                          }
                          size={22}
                          color={selected ? palette.accent.base : palette.text.tertiary}
                        />
                        <Text
                          style={[
                            styles.paymentModeText,
                            {
                              color: selected ? palette.accent.base : palette.text.secondary,
                              fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                            },
                          ]}
                        >
                          {t(paymentModeLabelKeys[mode.value])}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <FormField
                  label={t("reception.payments.amountReceived")}
                  value={amount}
                  onChangeText={(value) => setAmount(normalizeRupeeInput(value))}
                  keyboardType="numeric"
                  placeholder="₹0"
                  leading={<Text style={{ color: palette.text.tertiary }}>₹</Text>}
                  returnKeyType="next"
                  required
                  error={amountInvalid ? t("reception.payments.amountInvalid") : undefined}
                />
                <FormField
                  testID="reception-payment-reference"
                  label={t("reception.payments.reference")}
                  value={referenceId}
                  onChangeText={setReferenceId}
                  optional
                  autoCapitalize="characters"
                  placeholder={t("reception.payments.referencePlaceholder")}
                />
                <FormField
                  testID="reception-payment-note"
                  label={t("reception.payments.deskNote")}
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  optional
                  multiline
                  placeholder={t("reception.payments.deskNotePlaceholder")}
                />
              </View>
              <AuditWarning>
                {t("reception.payments.auditWarning")}
              </AuditWarning>
              <FormField
                testID="reception-payment-staff-note"
                label={t("reception.payments.staffNote")}
                value={paymentReason}
                onChangeText={setPaymentReason}
                required
              />
              <PrimaryButton
                testID="reception-record-payment"
                icon="shield-checkmark-outline"
                disabled={
                  !canRecordOfflinePayment || !canRecordPayment || recordPaymentMutation.isPending
                }
                onLongPress={!canRecordOfflinePayment ? showOwnerApprovalRequired : undefined}
                onPress={recordPayment}
              >
                {t("reception.payments.recordPayment")}
              </PrimaryButton>
              {paymentStatus ? (
                <Text
                  testID="reception-payment-status"
                  style={[styles.statusText, { color: palette.accent.base }]}
                >
                  {paymentStatus}
                </Text>
              ) : null}
            </Card>
    </>
  );
}
