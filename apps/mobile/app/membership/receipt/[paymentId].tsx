import { useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useMyInvoices, useMyMemberships, type InvoiceRecord } from "@/lib/domains";
import { toWebUrl } from "@/lib/api";
import { formatDateTime, formatInr, titleCaseFromCode } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
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
          subtitle={payment?.receiptNumber ? t("member.receipt.receiptNumber", { number: payment.receiptNumber }) : t("member.receipt.paymentDetails")}
          showBack
        />

        {membershipsQuery.isError ? (
          <QueryErrorState
            error={membershipsQuery.error}
            onRetry={() => void membershipsQuery.refetch()}
          />
        ) : null}
        {invoicesQuery.isError ? (
          <QueryErrorState error={invoicesQuery.error} onRetry={() => void invoicesQuery.refetch()} />
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
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.purpose")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.amount")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {formatInr(payment.amountPaise)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.status")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.status ?? "CREATED")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.mode")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.mode ?? "ONLINE")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.recorded")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.receiptNo")}</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {payment.receiptNumber ?? t("member.receipt.generating")}
                </Text>
              </View>
            </Card>

            {invoice ? (
              <Card variant="compact" contentStyle={styles.stack}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                  {t("member.receipt.invoice")}
                </Text>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.invoiceNo")}</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? t("member.receipt.invoice")}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.issued")}</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>{t("member.receipt.total")}</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                  </Text>
                </View>
                {invoice.invoiceUrl ? (
                  <ZookButton
                    icon="download-outline"
                    onPress={() => void Linking.openURL(toWebUrl(invoice.invoiceUrl ?? ""))}
                  >
                    {t("member.receipt.downloadInvoice")}
                  </ZookButton>
                ) : null}
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
  sectionTitle: {
    ...typography.cardTitle,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
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
});
