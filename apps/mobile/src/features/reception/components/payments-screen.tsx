import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

import { membershipStatusLabel, toneForStatus } from "@/components/membership/helpers";
import {
  AuditWarning,
  Card,
  EmptyState,
  FormField,
  IconBubble,
  Pill,
  PrimaryButton,
  SearchField,
  SectionHeader,
} from "@/components/primitives";
import { formatInr, normalizeRupeeInput } from "@/lib/formatting";
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
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const {
    amount,
    amountInvalid,
    canRecordOfflinePayment,
    canRecordPayment,
    dueAmount,
    memberRecord,
    membersQuery,
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
  const paymentMemberSearchTerm = paymentMemberSearch.trim().toLowerCase();
  const paymentDetailsSummary =
    [
      referenceId.trim() ? referenceId.trim() : null,
      paymentNote.trim() ? paymentNote.trim() : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("reception.payments.noAdditionalDetails");
  const matchingPaymentMembers = paymentMemberSearchTerm.length >= 2
    ? (membersQuery.data?.members ?? [])
        .filter((record) => {
          const name = record.user?.name?.toLowerCase() ?? "";
          const email = record.user?.email?.toLowerCase() ?? "";
          const phone = record.user?.phone?.toLowerCase() ?? "";
          return (
            name.includes(paymentMemberSearchTerm) ||
            email.includes(paymentMemberSearchTerm) ||
            phone.includes(paymentMemberSearchTerm)
          );
        })
        .slice(0, 8)
    : [];

  return (
    <>
      {!memberRecord ? (
        <Card variant="compact" padding={14} contentStyle={styles.stack}>
          <SectionHeader title={t("reception.payments.findMember")} />
          <SearchField
            testID="reception-payment-member-search"
            value={paymentMemberSearch}
            onChangeText={setPaymentMemberSearch}
            placeholder={t("reception.payments.searchPlaceholder")}
          />
          {paymentMemberSearchTerm.length >= 2 ? (
            <View style={styles.stack}>
              {matchingPaymentMembers.length ? (
                matchingPaymentMembers.map((record) => (
                  <Pressable
                    key={record.profile.userId}
                    onPress={() => {
                      setSelectedMemberId(record.profile.userId);
                      setPaymentMemberSearch("");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("reception.payments.selectMemberAccessibility", {
                      name: record.user?.name ?? t("reception.orders.thisMember"),
                    })}
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
                        {record.user?.email ??
                          record.user?.phone ??
                          t("reception.payments.noContact")}
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
                        ? membershipStatusLabel(record.activeSubscription.status, t)
                        : t("reception.payments.noPlan")}
                    </Pill>
                  </Pressable>
                ))
              ) : (
                <EmptyState
                  icon="search-outline"
                  title={t("reception.members.noMembers")}
                  body={t("reception.members.noMembersBody")}
                />
              )}
            </View>
          ) : null}
        </Card>
      ) : null}
      {memberRecord ? (
        <Card variant="compact" padding={14} contentStyle={styles.stack}>
          <SectionHeader
            title={t("reception.payments.collection")}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("reception.payments.changeMember")}
                hitSlop={8}
                onPress={() => {
                  setSelectedMemberId(null);
                  setAmount("");
                  setReferenceId("");
                }}
                style={({ pressed }) => [
                  styles.paymentChangeMemberAction,
                  {
                    borderColor: palette.border.default,
                    backgroundColor: palette.surface.default,
                  },
                  pressed ? styles.paymentChangeMemberActionPressed : null,
                ]}
              >
                <Ionicons name="swap-horizontal-outline" size={17} color={palette.text.secondary} />
              </Pressable>
            }
          />
          <View
            style={[
              styles.paymentDuePanel,
              {
                backgroundColor: palette.surface.accentSoft,
                borderColor: palette.accent.soft,
              },
            ]}
          >
            <View style={styles.paymentDueCopy}>
              <Text style={[styles.fieldGroupLabel, { color: palette.text.tertiary }]}>
                {t("reception.payments.due")}
              </Text>
              <Text style={[styles.paymentDueAmount, { color: palette.text.primary }]}>
                {formatInr(dueAmount)}
              </Text>
            </View>
            <Text numberOfLines={1} style={[styles.paymentDueMember, { color: palette.text.secondary }]}>
              {memberRecord.user?.name ?? t("reception.members.memberTitle")}
            </Text>
          </View>
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
                      size={18}
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
          </View>
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
          <View style={styles.formStack}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showPaymentDetails }}
              onPress={() => setShowPaymentDetails((value) => !value)}
              style={({ pressed }) => [
                styles.paymentDetailsRow,
                {
                  borderColor: palette.border.default,
                  backgroundColor: palette.surface.default,
                },
                pressed ? styles.paymentDetailsRowPressed : null,
              ]}
            >
              <View style={styles.paymentDetailsCopy}>
                <Text style={[styles.paymentDetailsTitle, { color: palette.text.primary }]}>
                  {t("reception.payments.additionalDetails")}
                </Text>
                <Text style={[styles.paymentDetailsMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                  {paymentDetailsSummary}
                </Text>
              </View>
              <Ionicons
                name={showPaymentDetails ? "chevron-up" : "chevron-down"}
                size={18}
                color={palette.text.secondary}
              />
            </Pressable>
            {showPaymentDetails ? (
              <View style={styles.formStack}>
                <FormField
                  testID="reception-payment-staff-note"
                  label={t("reception.payments.staffNote")}
                  value={paymentReason}
                  onChangeText={setPaymentReason}
                  required
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
            ) : null}
          </View>
          <AuditWarning compact>{t("reception.payments.auditWarning")}</AuditWarning>
          {paymentStatus ? (
            <Text
              testID="reception-payment-status"
              style={[styles.statusText, { color: palette.accent.base }]}
            >
              {paymentStatus}
            </Text>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
