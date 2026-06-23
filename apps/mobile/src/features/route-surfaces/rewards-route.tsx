import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  ZookButton,
  ZookScreen,
  type PillTone,
} from "@/components/primitives";
import {
  useGymReferral,
  useRequestWithdrawal,
  useRewardsWallet,
  type RewardEntry,
} from "@/lib/domains/rewards/queries";
import { formatInr, formatRelativeDate } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

const MIN_WITHDRAWAL_PAISE = 100000; // ₹1,000

function statusTone(status: RewardEntry["status"]): PillTone {
  if (status === "PAYABLE" || status === "PAID") return "lime";
  if (status === "QUALIFIED") return "blue";
  if (status === "PENDING" || status === "REQUESTED") return "amber";
  return "red"; // REVERSED
}

function statusLabel(status: RewardEntry["status"]) {
  if (status === "PAYABLE") return "Ready";
  if (status === "PAID") return "Paid";
  if (status === "QUALIFIED") return "Clearing";
  if (status === "PENDING") return "Pending";
  if (status === "REQUESTED") return "Requested";
  return "Reversed";
}

export default function RewardsRoute() {
  const { palette } = useTheme();
  const walletQuery = useRewardsWallet();
  const referralQuery = useGymReferral();
  const requestWithdrawal = useRequestWithdrawal();
  const [refreshing, setRefreshing] = useState(false);

  const wallet = walletQuery.data;
  const referral = referralQuery.data;
  const isCash = !referral?.rewardDays; // owners earn days, others earn cash
  const payable = wallet?.payablePaise ?? 0;
  const canWithdraw = isCash && payable >= MIN_WITHDRAWAL_PAISE && !requestWithdrawal.isPending;

  async function refresh() {
    setRefreshing(true);
    await Promise.all([walletQuery.refetch(), referralQuery.refetch()]);
    setRefreshing(false);
  }

  function shareCode() {
    if (!referral) return;
    void Share.share({
      message: `Run your gym on Zook — sign up with my link: ${referral.shareUrl}`,
      url: referral.shareUrl,
    });
  }

  function confirmWithdraw() {
    if (!canWithdraw) return;
    Alert.alert(
      "Request withdrawal?",
      `We'll review and pay out ${formatInr(payable)} to you. You'll get a confirmation once it's sent.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Request", onPress: () => requestWithdrawal.mutate(payable) },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="rewards-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <AppHeader title="Refer & earn" subtitle="Bring new gyms to Zook and get rewarded." showBack />

          {referralQuery.isError ? (
            <QueryErrorState error={referralQuery.error} onRetry={() => void referralQuery.refetch()} />
          ) : null}

          {/* Refer a gym to Zook */}
          {referral ? (
            <Card contentStyle={styles.heroCard}>
              <IconBubble icon="gift" tone="lime" size={48} />
              <Text style={[styles.heroTitle, { color: palette.text.primary }]}>
                {isCash
                  ? `Earn ${formatInr(referral.rewardPaise ?? 0)} per gym`
                  : `Earn ${referral.rewardDays} free days per gym`}
              </Text>
              <Text style={[styles.heroBody, { color: palette.text.secondary }]}>{referral.terms}</Text>
              <View style={styles.codeRow}>
                <View style={[styles.codePill, { backgroundColor: palette.surface.accentSoft }]}>
                  <Text style={[styles.codeText, { color: palette.accent.base }]}>{referral.code}</Text>
                </View>
                <View style={styles.cycleRow}>
                  {referral.qualifyingCycles.map((cycle) => (
                    <Pill key={cycle} tone="neutral">{cycle}</Pill>
                  ))}
                </View>
              </View>
              <ZookButton onPress={shareCode} icon="share-social-outline" size="lg">
                Share your link
              </ZookButton>
            </Card>
          ) : null}

          {/* Cash wallet (non-owners only) */}
          {isCash ? (
            <>
              <SectionHeader title="Your earnings" />
              {walletQuery.isError ? (
                <QueryErrorState error={walletQuery.error} onRetry={() => void walletQuery.refetch()} />
              ) : null}
              <Card contentStyle={styles.walletCard}>
                <View style={styles.balanceRow}>
                  <View style={styles.balanceMain}>
                    <Text style={[styles.balanceLabel, { color: palette.text.secondary }]}>Ready to withdraw</Text>
                    <Text style={[styles.balanceValue, { color: palette.text.primary }]}>{formatInr(payable)}</Text>
                  </View>
                  <View style={styles.balanceSide}>
                    <Text style={[styles.sideLabel, { color: palette.text.secondary }]}>Clearing</Text>
                    <Text style={[styles.sideValue, { color: palette.text.primary }]}>{formatInr(wallet?.pendingPaise ?? 0)}</Text>
                    <Text style={[styles.sideLabel, { color: palette.text.secondary }]}>Lifetime</Text>
                    <Text style={[styles.sideValue, { color: palette.text.primary }]}>{formatInr(wallet?.lifetimePaise ?? 0)}</Text>
                  </View>
                </View>
                <ZookButton
                  onPress={confirmWithdraw}
                  disabled={!canWithdraw}
                  busy={requestWithdrawal.isPending}
                  busyLabel="Requesting..."
                  icon="cash-outline"
                  variant={canWithdraw ? "primary" : "secondary"}
                >
                  {payable >= MIN_WITHDRAWAL_PAISE ? "Request withdrawal" : `Min ₹${MIN_WITHDRAWAL_PAISE / 100} to withdraw`}
                </ZookButton>
              </Card>

              <SectionHeader title="Activity" />
              {wallet && wallet.entries.length === 0 ? (
                <Card variant="compact">
                  <EmptyState icon="gift-outline" title="No earnings yet" body="Share your link — you'll earn when a gym you refer subscribes." />
                </Card>
              ) : null}
              <View style={styles.stack}>
                {wallet?.entries.map((entry) => (
                  <Card key={entry.id} variant="compact" contentStyle={styles.entryRow}>
                    <IconBubble
                      icon={entry.kind === "WITHDRAWAL" ? "arrow-up-circle-outline" : "business-outline"}
                      tone={statusTone(entry.status)}
                      size={38}
                    />
                    <View style={styles.entryCopy}>
                      <Text style={[styles.entryTitle, { color: palette.text.primary }]} numberOfLines={1}>{entry.label}</Text>
                      <Text style={[styles.entryMeta, { color: palette.text.secondary }]}>{formatRelativeDate(entry.createdAt)}</Text>
                    </View>
                    <View style={styles.entryRight}>
                      <Text style={[styles.entryAmount, { color: entry.amountPaise < 0 ? palette.text.secondary : palette.text.primary }]}>
                        {entry.amountPaise < 0 ? "-" : ""}{formatInr(Math.abs(entry.amountPaise))}
                      </Text>
                      <Pill tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Pill>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : (
            <Card variant="compact" contentStyle={styles.entryRow}>
              <IconBubble icon="time-outline" tone="blue" size={38} />
              <Text style={[styles.entryMeta, { color: palette.text.secondary, flex: 1 }]}>
                Free Zook days are added to your subscription automatically once a referred gym subscribes.
              </Text>
            </Card>
          )}
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
  heroCard: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  heroTitle: { ...typography.cardTitle, textAlign: "center" },
  heroBody: { ...typography.small, maxWidth: 300, textAlign: "center" },
  codeRow: { alignItems: "center", gap: spacing.sm },
  codePill: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  codeText: { ...typography.cardTitle, letterSpacing: 1 },
  cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, justifyContent: "center" },
  walletCard: { gap: spacing.md },
  balanceRow: { flexDirection: "row", gap: spacing.md },
  balanceMain: { flex: 1, gap: 4 },
  balanceLabel: { ...typography.caption },
  balanceValue: { ...typography.display, fontSize: 34 },
  balanceSide: { alignItems: "flex-end", gap: 2 },
  sideLabel: { ...typography.small },
  sideValue: { ...typography.bodyStrong },
  stack: { gap: spacing.sm },
  entryRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  entryCopy: { flex: 1, gap: 2, minWidth: 0 },
  entryTitle: { ...typography.bodyStrong },
  entryMeta: { ...typography.small },
  entryRight: { alignItems: "flex-end", gap: 4 },
  entryAmount: { ...typography.bodyStrong },
});
