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
          eyebrow="Membership"
          title="Receipt"
          subtitle={payment?.receiptNumber ? `Receipt ${payment.receiptNumber}` : "Payment details"}
          showProfileShortcut={false}
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
              title="Receipt not found"
              body="We couldn't find that payment in your membership history."
            />
          </Card>
        ) : null}

        {payment ? (
          <>
            <Card contentStyle={styles.stack}>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Purpose</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Amount</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {formatInr(payment.amountPaise)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Status</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.status ?? "CREATED")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Mode</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {titleCaseFromCode(payment.mode ?? "ONLINE")}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Recorded</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: palette.text.secondary }]}>Receipt no.</Text>
                <Text style={[styles.value, { color: palette.text.primary }]}>
                  {payment.receiptNumber ?? "Generating after confirmation"}
                </Text>
              </View>
            </Card>

            {invoice ? (
              <Card variant="compact" contentStyle={styles.stack}>
                <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
                  Invoice
                </Text>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>Invoice no.</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {invoice.invoiceNumber ?? invoice.invoiceNo ?? "Invoice"}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>Issued</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {formatDateTime(invoice.issueDate ?? invoice.issuedAt)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.label, { color: palette.text.secondary }]}>Total</Text>
                  <Text style={[styles.value, { color: palette.text.primary }]}>
                    {formatInr(invoice.totalPaise ?? invoice.amountPaise)}
                  </Text>
                </View>
                {invoice.invoiceUrl ? (
                  <ZookButton
                    icon="download-outline"
                    onPress={() => void Linking.openURL(toWebUrl(invoice.invoiceUrl ?? ""))}
                  >
                    Download invoice
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
    paddingTop: 14,
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
