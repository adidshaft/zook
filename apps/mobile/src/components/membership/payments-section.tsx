import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, IconBubble, Pill, SectionHeader } from "@/components/primitives";
import { formatDateTime, formatInr, titleCaseFromCode } from "@/lib/formatting";
import { colors, spacing, typography } from "@/lib/theme";
import { toneForStatus } from "./helpers";
import type { InvoiceRecord, MembershipPaymentRecord, PaymentDocumentKind } from "./types";

export function PaymentsSection({
  documentBusyKey,
  invoices,
  onCreateDocument,
  payments,
}: {
  documentBusyKey: string | null;
  invoices: InvoiceRecord[];
  onCreateDocument: (payment: MembershipPaymentRecord, kind: PaymentDocumentKind) => void;
  payments: MembershipPaymentRecord[];
}) {
  return (
    <>
      <SectionHeader title="Payments" />
      {payments.length ? (
        <View style={styles.stack}>
          {payments.map((payment) => {
            const canGenerate =
              payment.status === "SUCCEEDED" || payment.status === "PARTIALLY_REFUNDED";
            const receiptBusy = documentBusyKey === `receipt:${payment.id}`;
            const invoiceBusy = documentBusyKey === `invoice:${payment.id}`;
            return (
              <GlassCard key={payment.id} variant="compact" contentStyle={styles.paymentContent}>
                <View style={styles.paymentIcon}>
                  <IconBubble icon="receipt-outline" tone="lime" size={34} />
                </View>
                <View style={styles.paymentCopy}>
                  <View style={styles.paymentHeader}>
                    <Text numberOfLines={1} style={styles.paymentTitle}>
                      {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                    </Text>
                    <Text style={styles.paymentAmount}>{formatInr(payment.amountPaise)}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.paymentBody}>
                    {titleCaseFromCode(payment.mode ?? "ONLINE")} ·{" "}
                    {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                  </Text>
                  <View style={styles.paymentMetaRow}>
                    <Pill
                      tone={payment.status === "SUCCEEDED" ? "lime" : toneForStatus(payment.status)}
                    >
                      {titleCaseFromCode(payment.status ?? "CREATED")}
                    </Pill>
                    {payment.receiptNumber ? (
                      <Text numberOfLines={1} style={styles.documentHint}>
                        Receipt {payment.receiptNumber}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.documentActions}>
                    <DocumentButton
                      busy={receiptBusy}
                      disabled={!canGenerate || receiptBusy || invoiceBusy}
                      icon="document-text-outline"
                      label="Receipt"
                      onPress={() => onCreateDocument(payment, "receipt")}
                    />
                    <DocumentButton
                      busy={invoiceBusy}
                      disabled={!canGenerate || invoiceBusy || receiptBusy}
                      icon="newspaper-outline"
                      label="Invoice"
                      onPress={() => onCreateDocument(payment, "invoice")}
                    />
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      ) : (
        <GlassCard variant="compact" contentStyle={styles.emptyPaymentContent}>
          <IconBubble icon="receipt-outline" tone="neutral" size={36} />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptyBody}>Transaction history will appear here.</Text>
          </View>
        </GlassCard>
      )}
      {invoices.length ? (
        <>
          <SectionHeader title="Invoices and receipts" />
          <View style={styles.stack}>
            {invoices.map((invoice) => (
              <GlassCard key={invoice.id} variant="compact" contentStyle={styles.invoiceContent}>
                <IconBubble icon="newspaper-outline" tone="blue" size={34} />
                <View style={styles.invoiceCopy}>
                  <Text numberOfLines={1} style={styles.paymentTitle}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? "Invoice"}
                  </Text>
                  <Text numberOfLines={1} style={styles.paymentBody}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)} ·{" "}
                    {titleCaseFromCode(invoice.invoiceStatus ?? invoice.status ?? "ISSUED")}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>
                  {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                </Text>
              </GlassCard>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function DocumentButton({
  busy,
  disabled,
  icon,
  label,
  onPress,
}: {
  busy: boolean;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Generate ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.documentButton,
        disabled ? styles.documentButtonDisabled : null,
        pressed && !disabled ? styles.documentButtonPressed : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.lime} />
      ) : (
        <Ionicons name={icon} size={14} color={colors.lime} />
      )}
      <Text style={styles.documentButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  emptyPaymentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyCopy: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.small,
  },
  paymentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paymentIcon: {
    alignSelf: "flex-start",
  },
  paymentCopy: {
    flex: 1,
    gap: 6,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentTitle: {
    flex: 1,
    color: colors.text,
    ...typography.cardTitle,
  },
  paymentAmount: {
    color: colors.text,
    ...typography.cardTitle,
  },
  paymentBody: {
    color: colors.muted,
    ...typography.small,
  },
  paymentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  documentHint: {
    flexShrink: 1,
    color: colors.muted,
    ...typography.small,
  },
  documentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: 2,
  },
  documentButton: {
    minHeight: 44,
    minWidth: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.08)",
    paddingHorizontal: 12,
  },
  documentButtonPressed: {
    backgroundColor: "rgba(185,244,85,0.16)",
  },
  documentButtonDisabled: {
    opacity: 0.45,
  },
  documentButtonText: {
    color: colors.text,
    ...typography.small,
    fontWeight: "700",
  },
  invoiceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  invoiceCopy: {
    flex: 1,
    gap: 4,
  },
});
