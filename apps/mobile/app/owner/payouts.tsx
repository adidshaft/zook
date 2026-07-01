import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  EmptyState,
  FormField,
  HeaderActions,
  IconBubble,
  ListRow,
  Pill,
  QueryErrorState,
  SectionHeader,
  ScreenHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { useOrgPayouts, useTrainerPayoutConfig } from "@/lib/domains/owner/queries";
import { useMarkPayoutPaid, useUpdatePayoutConfig } from "@/lib/domains/owner/mutations";
import type { TrainerPayoutRecord } from "@/lib/domains/shared/types";
import { formatInr, titleCaseFromCode } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

function PayoutConfigForm({ trainerId }: { trainerId: string }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const configQuery = useTrainerPayoutConfig(trainerId);
  const updateConfig = useUpdatePayoutConfig();
  const config = configQuery.data?.config;
  const [base, setBase] = useState("");
  const [commission, setCommission] = useState("");
  const [perSession, setPerSession] = useState("");
  const [payDay, setPayDay] = useState("");
  const [loaded, setLoaded] = useState(false);

  if (config && !loaded) {
    setBase(String(Math.round(config.baseMonthlyPaise / 100)));
    setCommission(String(config.ptCommissionPercent));
    setPerSession(String(Math.round(config.perSessionFeePaise / 100)));
    setPayDay(String(config.payDay));
    setLoaded(true);
  }

  function save() {
    updateConfig.mutate({
      trainerUserId: trainerId,
      config: {
        baseMonthlyPaise: (Number.parseInt(base, 10) || 0) * 100,
        ptCommissionPercent: Math.min(100, Math.max(0, Number.parseInt(commission, 10) || 0)),
        perSessionFeePaise: (Number.parseInt(perSession, 10) || 0) * 100,
        payDay: Math.min(28, Math.max(1, Number.parseInt(payDay, 10) || 5)),
      },
    });
  }

  return (
    <View style={[styles.configBox, { borderTopColor: palette.border.subtle }]}>
      <Text style={[styles.configTitle, { color: palette.text.secondary }]}>
        {t("owner.payouts.settings")}
      </Text>
      <View style={styles.configRow}>
        <FormField label={t("owner.payouts.baseMonthly")} value={base} onChangeText={setBase} keyboardType="number-pad" placeholder="15000" />
        <FormField label={t("owner.payouts.ptCommission")} value={commission} onChangeText={setCommission} keyboardType="number-pad" placeholder="40" />
        <FormField label={t("owner.payouts.perSession")} value={perSession} onChangeText={setPerSession} keyboardType="number-pad" placeholder="300" />
        <FormField label={t("owner.payouts.payDay")} value={payDay} onChangeText={setPayDay} keyboardType="number-pad" placeholder="5" />
      </View>
      <ZookButton size="sm" onPress={save} busy={updateConfig.isPending} busyLabel={t("common.saving")} icon="save-outline">
        {t("owner.payouts.saveSettings")}
      </ZookButton>
    </View>
  );
}

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
  const { t } = useI18n();
  const isPaid = payout.status.toUpperCase() === "PAID";
  const lineCount = payout.lines?.length ?? 0;
  const [showLines, setShowLines] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  return (
    <Card variant="compact" contentStyle={styles.payoutCard}>
      <View style={styles.payoutHeader}>
        <IconBubble icon="person-outline" tone="blue" size={42} />
        <View style={styles.payoutCopy}>
          <Text style={[styles.payoutName, { color: palette.text.primary }]}>
            {payout.trainerName ?? t("owner.payouts.trainerFallback")}
          </Text>
          <Text style={[styles.payoutMeta, { color: palette.text.secondary }]}>
            {payout.period ?? t("owner.payouts.thisMonth")} · {t("owner.payouts.earningLines", { count: lineCount })}
          </Text>
        </View>
        <View style={styles.payoutRight}>
          <Text style={[styles.payoutTotal, { color: palette.text.primary }]}>
            {formatInr(payout.totalPaise)}
          </Text>
          <Pill tone={payoutTone(payout.status)}>{titleCaseFromCode(payout.status)}</Pill>
        </View>
      </View>
      {showLines
        ? payout.lines?.map((line) => (
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
          ))
        : null}
      {isPaid ? (
        <View style={styles.paidRow}>
          <Text style={[styles.paidText, { color: palette.accent.base }]}>
            {t("owner.payouts.paid")}{payout.paidAt ? ` · ${new Date(payout.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
          </Text>
        </View>
      ) : (
        <View style={styles.payoutActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("owner.payouts.markPaid")}
            disabled={busy}
            hitSlop={10}
            onPress={onMarkPaid}
            style={({ pressed }) => [
              styles.markPaidCompact,
              { backgroundColor: palette.accent.base },
              pressed ? styles.pressedAction : null,
              busy ? styles.disabledAction : null,
            ]}
          >
            <Ionicons name="checkmark-circle-outline" size={17} color={palette.text.onAccent} />
            <Text style={[styles.markPaidText, { color: palette.text.onAccent }]}>
              {busy ? t("owner.payouts.marking") : t("owner.payouts.markPaid")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("owner.payouts.earningLines", { count: lineCount })}
            hitSlop={10}
            onPress={() => setShowLines((current) => !current)}
            style={({ pressed }) => [
              styles.iconAction,
              { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              pressed ? styles.pressedAction : null,
            ]}
          >
            <Ionicons name={showLines ? "receipt" : "receipt-outline"} size={18} color={palette.text.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showConfig ? t("owner.payouts.hideSettings") : t("owner.payouts.settings")}
            hitSlop={10}
            onPress={() => setShowConfig((current) => !current)}
            style={({ pressed }) => [
              styles.iconAction,
              { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              pressed ? styles.pressedAction : null,
            ]}
          >
            <Ionicons name={showConfig ? "options" : "options-outline"} size={18} color={palette.text.secondary} />
          </Pressable>
        </View>
      )}
      {isPaid ? (
        <View style={styles.payoutActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("owner.payouts.earningLines", { count: lineCount })}
            hitSlop={10}
            onPress={() => setShowLines((current) => !current)}
            style={({ pressed }) => [
              styles.iconAction,
              { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              pressed ? styles.pressedAction : null,
            ]}
          >
            <Ionicons name={showLines ? "receipt" : "receipt-outline"} size={18} color={palette.text.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showConfig ? t("owner.payouts.hideSettings") : t("owner.payouts.settings")}
            hitSlop={10}
            onPress={() => setShowConfig((current) => !current)}
            style={({ pressed }) => [
              styles.iconAction,
              { borderColor: palette.border.default, backgroundColor: palette.surface.default },
              pressed ? styles.pressedAction : null,
            ]}
          >
            <Ionicons name={showConfig ? "options" : "options-outline"} size={18} color={palette.text.secondary} />
          </Pressable>
        </View>
      ) : null}
      {showConfig ? <PayoutConfigForm trainerId={payout.trainerId} /> : null}
    </Card>
  );
}

export default function OwnerPayouts() {
  const { palette } = useTheme();
  const { t } = useI18n();
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
      t("owner.payouts.confirmTitle", { name: payout.trainerName ?? t("owner.payouts.trainerLower") }),
      t("owner.payouts.confirmBody", {
        amount: formatInr(payout.totalPaise),
        period: payout.period ?? t("owner.payouts.thisMonthLower"),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("owner.payouts.markPaid"),
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
          <ScreenHeader
            title={t("owner.payouts.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />

          {payoutsQuery.isError ? (
            <QueryErrorState error={payoutsQuery.error} onRetry={() => void payoutsQuery.refetch()} />
          ) : null}

          {!payoutsQuery.isLoading && payouts.length === 0 ? (
            <Card variant="compact">
              <EmptyState icon="cash-outline" title={t("owner.payouts.emptyTitle")} body={t("owner.payouts.emptyBody")} />
            </Card>
          ) : null}

          {payouts.length ? (
            <>
              <SectionHeader
                title={t("owner.payouts.outstanding")}
                action={<Pill tone={outstanding > 0 ? "amber" : "neutral"}>{formatInr(outstanding)}</Pill>}
              />
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
            </>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: { gap: spacing.md },
  payoutCard: { gap: spacing.sm },
  payoutHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  payoutCopy: { flex: 1, gap: 2, minWidth: 0 },
  payoutName: { ...typography.cardTitle },
  payoutMeta: { ...typography.small },
  payoutRight: { alignItems: "flex-end", gap: 5 },
  payoutTotal: { ...typography.cardTitle },
  lineAmount: { ...typography.bodyStrong },
  payoutActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
  markPaidCompact: {
    alignItems: "center",
    borderRadius: radii.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  markPaidText: { ...typography.caption, fontFamily: "Inter_700Bold" },
  iconAction: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 42,
  },
  pressedAction: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  disabledAction: { opacity: 0.56 },
  paidRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  paidText: { ...typography.caption },
  configBox: { borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingTop: spacing.md },
  configTitle: { ...typography.caption, textTransform: "uppercase" },
  configRow: { gap: spacing.sm },
});
