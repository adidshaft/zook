import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  IconBubble,
  ListRow,
  Pill,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useOrgPayouts } from "@/lib/domains/owner/queries";
import { useMarkPayoutPaid } from "@/lib/domains/owner/mutations";
import type { TrainerPayoutRecord } from "@/lib/domains/shared/types";
import { formatInr, titleCaseFromCode } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function payoutTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "PAID") return "lime" as const;
  if (normalized.includes("ACCRU") || normalized.includes("DRAFT")) return "amber" as const;
  if (normalized.includes("APPROV")) return "blue" as const;
  return "neutral" as const;
}

function PayoutCard({
  payout,
  busy,
  onMarkPaid,
}: {
  payout: TrainerPayoutRecord;
  busy: boolean;
  onMarkPaid: () => void;
}) {
  const { palette } = useTheme();
  const isPaid = payout.status.toUpperCase() === "PAID";
  return (
    <Card variant="compact" contentStyle={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <IconBubble icon="person-outline" tone="blue" size={42} />
        <View style={styles.payoutCopy}>
          <Text style={[styles.payoutName, { color: palette.text.primary }]}>
            {payout.trainerName ?? "Trainer"}
          </Text>
          <Text style={[styles.payoutMeta, { color: palette.text.secondary }]}>
            {payout.period ?? "This month"} · {payout.lines?.length ?? 0} earning lines
          </Text>
        </View>
        <Pill tone={payoutTone(payout.status)}>{titleCaseFromCode(payout.status)}</Pill>
      </View>
      <Text style={[styles.payoutTotal, { color: palette.text.primary }]}>
        {formatInr(payout.totalPaise)}
      </Text>
      {payout.lines?.map((line) => (
        <ListRow
          key={line.id}
          title={line.description}
          subtitle={line.kind}
          trailing={
            <Text style={[styles.lineAmount, { color: palette.text.primary }]}>
              {formatInr(line.amountPaise)}
            </Text>
          }
        />
      ))}
      {isPaid ? (
        <View style={styles.paidRow}>
          <Text style={[styles.paidText, { color: palette.accent.base }]}>
            Paid{payout.paidAt ? ` · ${new Date(payout.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </Text>
        </View>
      ) : (
        <ZookButton onPress={onMarkPaid} busy={busy} busyLabel="Marking..." icon="checkmark-circle-outline">
          Mark paid
        </ZookButton>
      )}
    </Card>
  );
}

export default function OwnerPayouts() {
  const { palette } = useTheme();
  const payoutsQuery = useOrgPayouts();
  const markPaid = useMarkPayoutPaid();
  const [refreshing, setRefreshing] = useState(false);
  const payouts = payoutsQuery.data?.payouts ?? [];
  const outstanding = payouts
    .filter((payout) => payout.status.toUpperCase() !== "PAID")
    .reduce((total, payout) => total + payout.totalPaise, 0);

  async function refresh() {
    setRefreshing(true);
    await payoutsQuery.refetch();
    setRefreshing(false);
  }

  function confirmMarkPaid(payout: TrainerPayoutRecord) {
    Alert.alert(
      `Pay ${payout.trainerName ?? "trainer"}?`,
      `Mark ${formatInr(payout.totalPaise)} as paid for ${payout.period ?? "this month"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark paid",
          onPress: () => markPaid.mutate({ payoutId: payout.id, method: "BANK_TRANSFER" }),
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-payouts-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title="Trainer payouts"
            subtitle="Review and pay your coaches."
            showProfileShortcut={false}
            showBack
          />

          <Card variant="compact" contentStyle={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: palette.text.secondary }]}>
              Outstanding this month
            </Text>
            <Text style={[styles.summaryValue, { color: palette.text.primary }]}>
              {formatInr(outstanding)}
            </Text>
          </Card>

          {payoutsQuery.isError ? (
            <QueryErrorState error={payoutsQuery.error} onRetry={() => void payoutsQuery.refetch()} />
          ) : null}

          {!payoutsQuery.isLoading && payouts.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="cash-outline" title="No payouts yet" body="Trainer earnings appear here as they accrue." />
            </Card>
          ) : null}

          <View style={styles.stack}>
            {payouts.map((payout) => (
              <PayoutCard
                key={payout.id}
                payout={payout}
                busy={markPaid.isPending && markPaid.variables?.payoutId === payout.id}
                onMarkPaid={() => confirmMarkPaid(payout)}
              />
            ))}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
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
  summaryCard: { gap: 2 },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.metric },
  stack: { gap: spacing.md },
  payoutCard: { gap: spacing.sm },
  payoutHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  payoutCopy: { flex: 1, gap: 2, minWidth: 0 },
  payoutName: { ...typography.cardTitle },
  payoutMeta: { ...typography.small },
  payoutTotal: { ...typography.metric },
  lineAmount: { ...typography.bodyStrong },
  paidRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  paidText: { ...typography.caption },
});
