import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, IconBubble, Pill, SectionHeader } from "@/components/primitives";
import { formatDateTime, formatInr, titleCaseFromCode, toneForPaymentStatus } from "@/lib/formatting";
import { spacing, typography, useTheme } from "@/lib/theme";
import type { InvoiceRecord, MembershipPaymentRecord, PaymentDocumentKind } from "./types";

export function PaymentsSection({
  documentBusyKey,
  invoices,
  onCreateDocument,
  onDownloadInvoice,
  payments,
}: {
  documentBusyKey: string | null;
  invoices: InvoiceRecord[];
  onCreateDocument: (payment: MembershipPaymentRecord, kind: PaymentDocumentKind) => void;
  onDownloadInvoice: (invoice: InvoiceRecord) => void;
  payments: MembershipPaymentRecord[];
}) {
  const { palette } = useTheme();
  const documentButtonTheme = {
    accentColor: palette.accent.base,
    backgroundColor: palette.surface.accentSoft,
    borderColor: palette.border.focus,
    pressedBackgroundColor: palette.surface.raised,
    textColor: palette.text.primary,
  };

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
            const documentHint = canGenerate
              ? payment.receiptNumber
                ? `Receipt ${payment.receiptNumber}`
                : "Receipt and invoice are available for confirmed payments."
              : `Documents unlock after payment succeeds. Current status: ${titleCaseFromCode(payment.status ?? "CREATED")}.`;
            return (
              <Card key={payment.id} variant="compact" contentStyle={styles.paymentContent}>
                <View style={styles.paymentIcon}>
                  <IconBubble icon="receipt-outline" tone={toneForPaymentStatus(payment.status)} size={34} />
                </View>
                <View style={styles.paymentCopy}>
                  <View style={styles.paymentHeader}>
                    <Text numberOfLines={1} style={[styles.paymentTitle, { color: palette.text.primary }]}>
                      {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                    </Text>
                    <Text style={[styles.paymentAmount, { color: palette.text.primary }]}>
                      {formatInr(payment.amountPaise)}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.paymentBody, { color: palette.text.secondary }]}>
                    {titleCaseFromCode(payment.mode ?? "ONLINE")} ·{" "}
                    {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                  </Text>
                  <View style={styles.paymentMetaRow}>
                    <Pill tone={toneForPaymentStatus(payment.status)}>
                      {titleCaseFromCode(payment.status ?? "CREATED")}
                    </Pill>
                    <Text numberOfLines={2} style={[styles.documentHint, { color: palette.text.secondary }]}>
                      {documentHint}
                    </Text>
                  </View>
                  <View style={styles.documentActions}>
                    <DocumentButton
                      busy={receiptBusy}
                      disabled={!canGenerate || receiptBusy || invoiceBusy}
                      icon="document-text-outline"
                      label="Receipt"
                      onPress={() => onCreateDocument(payment, "receipt")}
                      theme={documentButtonTheme}
                    />
                    <DocumentButton
                      busy={invoiceBusy}
                      disabled={!canGenerate || invoiceBusy || receiptBusy}
                      icon="newspaper-outline"
                      label="Invoice"
                      onPress={() => onCreateDocument(payment, "invoice")}
                      theme={documentButtonTheme}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card variant="compact" contentStyle={styles.emptyPaymentContent}>
          <IconBubble icon="receipt-outline" tone="neutral" size={36} />
          <View style={styles.emptyCopy}>
            <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>No payments yet</Text>
            <Text style={[styles.emptyBody, { color: palette.text.secondary }]}>
              Transaction history will appear here.
            </Text>
          </View>
        </Card>
      )}
      {invoices.length ? (
        <>
          <SectionHeader title="Invoices and receipts" />
          <View style={styles.stack}>
            {invoices.map((invoice) => (
              <Card key={invoice.id} variant="compact" contentStyle={styles.invoiceContent}>
                <IconBubble icon="newspaper-outline" tone="blue" size={34} />
                <View style={styles.invoiceCopy}>
                  <Text numberOfLines={1} style={[styles.paymentTitle, { color: palette.text.primary }]}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? "Invoice"}
                  </Text>
                  <Text numberOfLines={1} style={[styles.paymentBody, { color: palette.text.secondary }]}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)} ·{" "}
                    {titleCaseFromCode(invoice.invoiceStatus ?? invoice.status ?? "ISSUED")}
                  </Text>
                </View>
                <View style={styles.invoiceActions}>
                  <Text style={[styles.paymentAmount, { color: palette.text.primary }]}>
                    {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                  </Text>
                  {invoice.invoiceUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Download invoice"
                      onPress={() => onDownloadInvoice(invoice)}
                      style={({ pressed }) => [
                        styles.documentButton,
                        {
                          borderColor: documentButtonTheme.borderColor,
                          backgroundColor: pressed
                            ? documentButtonTheme.pressedBackgroundColor
                            : documentButtonTheme.backgroundColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name="download-outline"
                        size={14}
                        color={documentButtonTheme.accentColor}
                      />
                      <Text
                        style={[
                          styles.documentButtonText,
                          { color: documentButtonTheme.textColor },
                        ]}
                      >
                        Download invoice
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
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
  theme,
}: {
  busy: boolean;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: {
    accentColor: string;
    backgroundColor: string;
    borderColor: string;
    pressedBackgroundColor: string;
    textColor: string;
  };
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Generate ${label.toLowerCase()}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.documentButton,
        {
          borderColor: theme.borderColor,
          backgroundColor: pressed && !disabled ? theme.pressedBackgroundColor : theme.backgroundColor,
        },
        disabled ? styles.documentButtonDisabled : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={theme.accentColor} />
      ) : (
        <Ionicons name={icon} size={14} color={theme.accentColor} />
      )}
      <Text style={[styles.documentButtonText, { color: theme.textColor }]}>{label}</Text>
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
    ...typography.cardTitle,
  },
  emptyBody: {
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
    ...typography.cardTitle,
  },
  paymentAmount: {
    ...typography.cardTitle,
  },
  paymentBody: {
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
    ...typography.small,
  },
  documentActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: 2,
  },
  invoiceActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
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
    paddingHorizontal: 12,
  },
  documentButtonDisabled: {
    opacity: 0.45,
  },
  documentButtonText: {
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
