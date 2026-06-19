import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MetricGrid } from "@/components/domain/metric-grid";
import { toneForStatus } from "@/components/membership/helpers";
import { AuditWarning, Card, FormField, IconBubble, ListRow, MoneySummaryCard, Pill, PrimaryButton, SearchField, SectionHeader } from "@/components/primitives";
import { formatInr, normalizeRupeeInput, titleCaseFromCode } from "@/lib/formatting";
import { useTheme } from "@/lib/theme";
import { paymentModes } from "../constants";
import { useReceptionWorkspace, receptionWorkspaceStyles as styles } from "../reception-workspace";

export function ReceptionPaymentsScreenBody() {
  const { palette } = useTheme();
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

  return (
    <>
            <MetricGrid
              items={[
                {
                  label: "Amount",
                  value: formatInr(dueAmount),
                  tone: "neutral",
                  icon: "receipt-outline",
                },
                {
                  label: "Mode",
                  value: paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual",
                  tone: "blue",
                  icon: "reader-outline",
                },
              ]}
            />
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <FormField
                testID="reception-payment-amount"
                label="Amount received"
                value={amount}
                onChangeText={(value) => setAmount(normalizeRupeeInput(value))}
                keyboardType="numeric"
                placeholder="₹0"
                leading={<Text style={{ color: palette.text.tertiary }}>₹</Text>}
                returnKeyType="next"
                required
                error={amountInvalid ? "Enter an amount greater than 0." : undefined}
              />
            </Card>
            <MoneySummaryCard
              title="Desk payment review"
              amount={formatInr(Number.parseFloat(amount || "0") * 100 || dueAmount)}
              rows={[
                { label: "Member", value: member?.name ?? "Select a member" },
                { label: "Due", value: formatInr(dueAmount) },
                {
                  label: "Mode",
                  value: paymentModes.find((mode) => mode.value === paymentMode)?.label ?? "Manual",
                },
                { label: "Desk", value: memberRecord ? "Active desk" : "Select member first" },
              ]}
              consequence="Only record this after cash, UPI, card, or bank transfer is actually received at the desk."
            />
            {!memberRecord ? (
              <Card variant="compact" padding={14} contentStyle={styles.stack}>
                <SectionHeader
                  title="Find a member"
                  subtitle="Search to attach this payment to a member."
                />
                <SearchField
                  testID="reception-payment-member-search"
                  value={paymentMemberSearch}
                  onChangeText={setPaymentMemberSearch}
                  placeholder="Name, email, or phone"
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
                          accessibilityLabel={`Select ${record.user?.name ?? "member"}`}
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
                              {record.user?.name ?? "Member"}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[styles.paymentMemberMeta, { color: palette.text.secondary }]}
                            >
                              {record.user?.email ?? record.user?.phone ?? "No contact"}
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
                              : "No plan"}
                          </Pill>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </Card>
            ) : null}
            <Card variant="compact" padding={14} contentStyle={styles.stack}>
              <SectionHeader
                title="Payment collection"
                subtitle="Record only money received at the desk."
              />
              <ListRow
                title="Member"
                subtitle={member?.name ?? "Select a member"}
                leading={<IconBubble icon="person-outline" tone="neutral" size={38} />}
                trailing={
                  <Pill tone={member ? "lime" : "amber"}>{member ? "Verified" : "Missing"}</Pill>
                }
              />
              <ListRow
                title="Invoice"
                subtitle={
                  membership?.status
                    ? `${titleCaseFromCode(membership.status)} membership selected`
                    : "No membership selected"
                }
                leading={<IconBubble icon="document-text-outline" tone="neutral" size={38} />}
                trailing={
                  <Text style={[styles.rowAmount, { color: palette.text.primary }]}>
                    {formatInr(dueAmount)} due
                  </Text>
                }
              />
              <View style={styles.formStack}>
                <Text style={[styles.fieldGroupLabel, { color: palette.text.tertiary }]}>
                  Collection mode
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
                          {mode.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <FormField
                  label="Amount received"
                  value={amount}
                  onChangeText={(value) => setAmount(normalizeRupeeInput(value))}
                  keyboardType="numeric"
                  placeholder="₹0"
                  leading={<Text style={{ color: palette.text.tertiary }}>₹</Text>}
                  returnKeyType="next"
                  required
                  error={amountInvalid ? "Enter an amount greater than 0." : undefined}
                />
                <FormField
                  testID="reception-payment-reference"
                  label="Receipt or reference"
                  value={referenceId}
                  onChangeText={setReferenceId}
                  optional
                  autoCapitalize="characters"
                  placeholder="UPI ref, bank UTR, card slip"
                />
                <FormField
                  testID="reception-payment-note"
                  label="Desk note"
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  optional
                  multiline
                  placeholder="Anything finance should see"
                />
              </View>
              <AuditWarning>
                All offline payments are recorded with audit logs. Ensure payment is received before recording.
              </AuditWarning>
              <FormField
                testID="reception-payment-staff-note"
                label="Staff note"
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
                Record Payment
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
