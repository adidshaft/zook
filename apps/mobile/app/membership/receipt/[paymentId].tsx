import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  QueryErrorState,
  ZookScreen,
} from "@/components/primitives";
import { useMyInvoices, useMyMemberships, type InvoiceRecord } from "@/lib/domains";
import { toWebUrl } from "@/lib/api";
import { formatDateTime, formatInr, titleCaseFromCode } from "@/lib/formatting";
import { type TranslationKey, useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type PaymentRecord = {
  id: string;
  purpose?: string | null;
  amountPaise?: number | null;
  status?: string | null;
  mode?: string | null;
  receiptNumber?: string | null;
  recordedAt?: string | null;
  createdAt?: string | null;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const paymentStatusLabelKeys: Record<string, TranslationKey> = {
  CREATED: "member.receipt.statusCreated",
  PAID: "shop.paid",
  PENDING: "shop.pending",
  PENDING_PAYMENT: "shop.pending",
  FAILED: "member.membership.guidanceFailedTitle",
  CANCELLED: "trainer.classes.cancelled",
};

const paymentModeLabelKeys: Record<string, TranslationKey> = {
  BANK_TRANSFER: "reception.payments.modeBank",
  CARD: "reception.payments.modeCard",
  CASH: "reception.payments.modeCash",
  DIRECT_UPI: "reception.payments.modeUpi",
  ONLINE: "member.receipt.modeOnline",
  UPI: "reception.payments.modeUpi",
};

function translatedCodeLabel(
  value: string | null | undefined,
  labels: Record<string, TranslationKey>,
  fallback: string,
  t: ReturnType<typeof useT>,
) {
  const key = String(value ?? fallback).toUpperCase();
  const labelKey = labels[key];
  return labelKey ? t(labelKey) : titleCaseFromCode(value ?? fallback);
}

export default function MembershipReceiptScreen() {
  const params = useLocalSearchParams<{ paymentId?: string | string[] }>();
  const paymentId = firstParam(params.paymentId);
  const { palette } = useTheme();
  const t = useT();
  const membershipsQuery = useMyMemberships();
  const invoicesQuery = useMyInvoices();
  const payments = (membershipsQuery.data?.payments ?? []) as PaymentRecord[];
  const payment = payments.find((item) => item.id === paymentId) ?? null;
  const invoice =
    ((invoicesQuery.data?.invoices ?? []) as InvoiceRecord[]).find(
      (item) => item.paymentId === paymentId,
    ) ?? null;

  return (
    <ZookScreen testID="membership-receipt-screen">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppHeader
          eyebrow={t("member.receipt.membership")}
          title={t("member.receipt.title")}
          subtitle={
            payment?.receiptNumber
              ? t("member.receipt.receiptNumber", { number: payment.receiptNumber })
              : t("member.receipt.paymentDetails")
          }
          showBack
        />

        {membershipsQuery.isError ? (
          <QueryErrorState
            error={membershipsQuery.error}
            onRetry={() => void membershipsQuery.refetch()}
          />
        ) : null}
        {invoicesQuery.isError ? (
          <QueryErrorState
            error={invoicesQuery.error}
            onRetry={() => void invoicesQuery.refetch()}
          />
        ) : null}

        {!membershipsQuery.isLoading && !payment ? (
          <Card variant="compact">
            <EmptyState
              title={t("member.receipt.notFound")}
              body={t("member.receipt.notFoundBody")}
            />
          </Card>
        ) : null}

        {payment ? (
          <>
            <Card contentStyle={styles.stack}>
              <View style={styles.receiptHero}>
                <View style={styles.receiptHeroText}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>
                    {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                  </Text>
                  <Text style={[styles.amountValue, { color: palette.text.primary }]}>
                    {formatInr(payment.amountPaise)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: palette.surface.accentSoft,
                      borderColor: palette.accent.soft,
                    },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: palette.accent.base }]}>
                    {translatedCodeLabel(payment.status, paymentStatusLabelKeys, "CREATED", t)}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>
                  {t("member.receipt.mode")}
                </Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {translatedCodeLabel(payment.mode, paymentModeLabelKeys, "ONLINE", t)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>
                  {t("member.receipt.recorded")}
                </Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                </Text>
              </View>
              {!payment.receiptNumber ? (
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>
                    {t("member.receipt.receiptNo")}
                  </Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {t("member.receipt.generating")}
                  </Text>
                </View>
              ) : null}
            </Card>

            {invoice ? (
              <Card variant="compact" contentStyle={styles.stack}>
                <View style={styles.sectionActionRow}>
                  <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                    {t("member.receipt.invoice")}
                  </Text>
                  {invoice.invoiceUrl ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("member.receipt.downloadInvoice")}
                      onPress={() => void Linking.openURL(toWebUrl(invoice.invoiceUrl ?? ""))}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.iconAction,
                        {
                          backgroundColor: palette.surface.raised,
                          borderColor: palette.border.default,
                        },
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons name="download-outline" size={18} color={palette.accent.base} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>
                    {t("member.receipt.invoiceNo")}
                  </Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? t("member.receipt.invoice")}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>
                    {t("member.receipt.issued")}
                  </Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)}
                  </Text>
                </View>
                {invoice.subtotalPaise != null ? (
                  <View
                    style={[
                      styles.row,
                      styles.dividerTop,
                      { borderTopColor: palette.border.subtle },
                    ]}
                  >
                    <Text style={[styles.label, { color: palette.text.secondary }]}>
                      {t("member.receipt.taxableAmount")}
                    </Text>
                    <Text style={[styles.value, { color: palette.text.primary }]}>
                      {formatInr(invoice.subtotalPaise)}
                    </Text>
                  </View>
                ) : null}
                {invoice.gstPaise != null ? (
                  <View style={styles.row}>
                    <Text style={[styles.label, { color: palette.text.secondary }]}>
                      {t("member.receipt.gst")}
                    </Text>
                    <Text style={[styles.value, { color: palette.text.primary }]}>
                      {formatInr(invoice.gstPaise)}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[styles.row, styles.totalRow, { borderTopColor: palette.border.subtle }]}
                >
                  <Text style={[styles.label, styles.totalLabel, { color: palette.text.primary }]}>
                    {t("member.receipt.total")}
                  </Text>
                  <Text style={[styles.value, styles.totalValue, { color: palette.text.primary }]}>
                    {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                  </Text>
                </View>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: {
    gap: spacing.sm,
  },
  receiptHero: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  receiptHeroText: {
    flex: 1,
    gap: spacing.xs,
  },
  amountValue: {
    ...typography.metric,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    ...typography.caption,
  },
  sectionTitle: {
    ...typography.cardTitle,
  },
  sectionActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  iconAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  dividerTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
    flex: 1,
  },
  value: {
    ...typography.bodyStrong,
    flex: 1,
    textAlign: "right",
  },
  totalLabel: {
    ...typography.bodyStrong,
  },
  totalValue: {
    ...typography.headerTitle,
    textAlign: "right",
  },
});
