import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, IconBubble, SectionHeader } from "@/components/primitives";
import { getTonePalette } from "@/components/primitives/tone-palette";
import { formatDateTime, formatInr, titleCaseFromCode, toneForPaymentStatus } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { paymentModeLabel, paymentStatusLabel } from "./helpers";
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
  const { mode, palette } = useTheme();
  const t = useT();
  const documentButtonTheme = {
    accentColor: palette.accent.base,
    backgroundColor: palette.surface.accentSoft,
    borderColor: palette.border.focus,
    pressedBackgroundColor: palette.surface.raised,
    textColor: palette.text.primary,
  };

  return (
    <>
      <SectionHeader title={t("member.membership.payments")} />
      {payments.length ? (
        <View style={styles.stack}>
          {payments.map((payment) => {
            const canGenerate =
              payment.status === "SUCCEEDED" || payment.status === "PARTIALLY_REFUNDED";
            const receiptBusy = documentBusyKey === `receipt:${payment.id}`;
            const invoiceBusy = documentBusyKey === `invoice:${payment.id}`;
            const documentHint = canGenerate
              ? payment.receiptNumber
                ? t("member.membership.receiptNumber", { number: payment.receiptNumber })
                : ""
              : t("member.membership.documentsAfterSuccess", {
                  status: paymentStatusLabel(payment.status, t),
                });
            return (
              <Card key={payment.id} variant="compact" contentStyle={styles.paymentContent}>
                <View style={styles.paymentSummaryRow}>
                  <IconBubble icon="receipt-outline" tone={toneForPaymentStatus(payment.status)} size={30} />
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
                      {paymentModeLabel(payment.mode, t)} ·{" "}
                      {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentMetaRow}>
                  <PaymentStatusBadge
                    colorMode={mode}
                    label={paymentStatusLabel(payment.status, t)}
                    palette={palette}
                    status={payment.status}
                  />
                  {documentHint ? (
                    <Text numberOfLines={1} style={[styles.documentHint, { color: palette.text.secondary }]}>
                      {documentHint}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.documentActions}>
                  <DocumentButton
                    busy={receiptBusy}
                    disabled={!canGenerate || receiptBusy || invoiceBusy}
                    icon="document-text-outline"
                    onPress={() => onCreateDocument(payment, "receipt")}
                    theme={documentButtonTheme}
                    visibleLabel={t("member.membership.receipt")}
                    generateLabel={t("member.membership.generateDocument", {
                      label: t("member.membership.receipt").toLowerCase(),
                    })}
                  />
                  <DocumentButton
                    busy={invoiceBusy}
                    disabled={!canGenerate || invoiceBusy || receiptBusy}
                    icon="newspaper-outline"
                    onPress={() => onCreateDocument(payment, "invoice")}
                    theme={documentButtonTheme}
                    visibleLabel={t("member.membership.invoice")}
                    generateLabel={t("member.membership.generateDocument", {
                      label: t("member.membership.invoice").toLowerCase(),
                    })}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <Card variant="compact" contentStyle={styles.emptyPaymentContent}>
          <Text style={[styles.emptyTitle, { color: palette.text.primary }]}>{t("member.membership.noPayments")}</Text>
        </Card>
      )}
      {invoices.length ? (
        <>
          <SectionHeader title={t("member.membership.generatedInvoices")} />
          <View style={styles.stack}>
            {invoices.map((invoice) => (
              <Card key={invoice.id} variant="compact" contentStyle={styles.invoiceContent}>
                <IconBubble icon="newspaper-outline" tone="neutral" size={28} />
                <View style={styles.invoiceCopy}>
                  <Text numberOfLines={1} style={[styles.paymentTitle, { color: palette.text.primary }]}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? t("member.membership.invoice")}
                  </Text>
                  <Text numberOfLines={1} style={[styles.paymentBody, { color: palette.text.secondary }]}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)} ·{" "}
                    {paymentStatusLabel(invoice.invoiceStatus ?? invoice.status ?? "CREATED", t)}
                  </Text>
                </View>
                <View style={styles.invoiceActions}>
                  <Text style={[styles.paymentAmount, { color: palette.text.primary }]}>
                    {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                  </Text>
                  {invoice.invoiceUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("member.membership.downloadInvoice")}
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
                        size={16}
                        color={documentButtonTheme.accentColor}
                      />
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

function PaymentStatusBadge({
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
  const tone = toneForPaymentStatus(status);
  const tonePalette = getTonePalette(tone, colorMode, palette);
  const normalized = String(status ?? "").toUpperCase();
  const icon: keyof typeof Ionicons.glyphMap =
    normalized === "SUCCEEDED" || normalized === "ISSUED"
      ? "checkmark"
      : normalized.includes("FAIL") || normalized.includes("CANCEL") || normalized.includes("REFUND")
        ? "alert-circle-outline"
        : "time-outline";

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.statusBadge,
        {
          borderColor: tonePalette.borderColor,
          backgroundColor: tonePalette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={tonePalette.color} />
      <Text
        numberOfLines={1}
        style={[styles.statusBadgeText, { color: tonePalette.color }]}
      >
        {label}
      </Text>
    </View>
  );
}

function DocumentButton({
  busy,
  disabled,
  icon,
  generateLabel,
  onPress,
  theme,
  visibleLabel,
}: {
  busy: boolean;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  generateLabel: string;
  onPress: () => void;
  theme: {
    accentColor: string;
    backgroundColor: string;
    borderColor: string;
    pressedBackgroundColor: string;
    textColor: string;
  };
  visibleLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={generateLabel}
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
        <Ionicons name={icon} size={16} color={theme.accentColor} />
      )}
      {visibleLabel ? (
        <Text numberOfLines={1} style={[styles.documentButtonText, { color: theme.textColor }]}>
          {visibleLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 8,
  },
  emptyPaymentContent: {
    alignItems: "flex-start",
  },
  emptyTitle: {
    ...typography.cardTitle,
  },
  paymentContent: {
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  paymentSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentTitle: {
    flex: 1,
    ...typography.bodyStrong,
  },
  paymentAmount: {
    ...typography.bodyStrong,
    fontVariant: ["tabular-nums"],
  },
  paymentBody: {
    ...typography.small,
  },
  paymentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  documentHint: {
    flex: 1,
    flexShrink: 1,
    ...typography.small,
  },
  statusBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 24,
    justifyContent: "center",
    maxWidth: 128,
    paddingHorizontal: 8,
  },
  statusBadgeText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  documentActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  invoiceActions: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  documentButton: {
    minHeight: 36,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
  },
  documentButtonText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  documentButtonDisabled: {
    opacity: 0.45,
  },
  invoiceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  invoiceCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
});
