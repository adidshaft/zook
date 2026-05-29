import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  GlassCard,
  ListRow,
  QueryErrorState,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import {
  useCancelSaasSubscription,
  useCreateSaasBillingMandate,
  useOwnerBillingSubscription,
  useUpgradeSaasSubscription,
} from "@/lib/domains/owner";
import { formatInr, formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { toWebUrl } from "@/lib/api";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type Tier = "STARTER" | "GROWTH" | "PRO";
type BillingCycle = "MONTHLY" | "YEARLY";

const tiers: Tier[] = ["STARTER", "GROWTH", "PRO"];

function formatLimit(value?: number | null) {
  return value == null ? "Unlimited" : String(value);
}

function usageLine(used?: number, limit?: number | null) {
  return `${used ?? 0} / ${formatLimit(limit)}`;
}

function resolveCheckoutUrl(value?: string | null, target: "owner-billing" = "owner-billing") {
  if (!value) return null;
  const resolved = value.startsWith("http://") || value.startsWith("https://") ? value : toWebUrl(value);
  const returnUrl = `zook://payments/return?target=${encodeURIComponent(target)}`;
  try {
    const parsed = new URL(resolved);
    parsed.searchParams.set("return_url", returnUrl);
    return parsed.toString();
  } catch {
    const separator = resolved.includes("?") ? "&" : "?";
    return `${resolved}${separator}return_url=${encodeURIComponent(returnUrl)}`;
  }
}

async function openCheckout(value?: string | null) {
  const url = resolveCheckoutUrl(value);
  if (!url) return;
  await Linking.openURL(url);
}

export default function OwnerBillingScreen() {
  const { palette } = useTheme();
  const billingQuery = useOwnerBillingSubscription();
  const createMandate = useCreateSaasBillingMandate();
  const upgrade = useUpgradeSaasSubscription();
  const cancel = useCancelSaasSubscription();
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const data = billingQuery.data;
  const subscription = data?.subscription;
  const mandate = data?.mandate;
  const busy = createMandate.isPending || upgrade.isPending || cancel.isPending;

  async function startMandateSetup() {
    try {
      const result = await createMandate.mutateAsync();
      showToast({ tone: "success", message: "Opening billing setup." });
      await openCheckout(result.checkoutUrl ?? result.mandate?.checkoutUrl);
    } catch (error) {
      showToast({
        tone: "danger",
        message: error instanceof Error ? error.message : "Could not start billing setup.",
      });
    }
  }

  async function upgradeTier(tier: Tier) {
    try {
      const result = await upgrade.mutateAsync({ tier, billingCycle: cycle });
      showToast({ tone: "success", message: "Opening plan checkout." });
      await openCheckout(result.checkoutUrl ?? result.mandate?.checkoutUrl);
    } catch (error) {
      showToast({
        tone: "danger",
        message: error instanceof Error ? error.message : "Could not open plan checkout.",
      });
    }
  }

  function confirmCancel() {
    Alert.alert("Cancel subscription?", "The subscription will be marked to cancel at period end.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: () => {
          void cancel
            .mutateAsync()
            .then(() => {
              showToast({ tone: "success", message: "Subscription cancellation requested." });
            })
            .catch((error) => {
              showToast({
                tone: "danger",
                message: error instanceof Error ? error.message : "Could not cancel subscription.",
              });
            });
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-billing-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={billingQuery.isRefetching}
                onRefresh={() => void billingQuery.refetch()}
                tintColor={palette.accent.fill}
                colors={[palette.accent.fill]}
              />
            ),
          }}
        >
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: palette.text.tertiary }]}>Owner billing</Text>
            <Text style={[styles.title, { color: palette.text.primary }]}>Trial and SaaS setup</Text>
            <Text style={[styles.subtitle, { color: palette.text.secondary }]}>
              Keep trial access, mandate setup, subscription status, and referral billing context visible on mobile.
            </Text>
          </View>

          {billingQuery.isError ? (
            <QueryErrorState error={billingQuery.error} onRetry={() => void billingQuery.refetch()} />
          ) : null}

          {!billingQuery.isError && !data ? (
            <EmptyState title="Loading billing" body="Subscription and mandate state will appear here." />
          ) : null}

          {data ? (
            <>
              <GlassCard contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>
                      {titleCaseFromCode(subscription?.tier)} plan
                    </Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      {titleCaseFromCode(subscription?.status)} · {titleCaseFromCode(subscription?.billingCycle)}
                    </Text>
                  </View>
                  <StatusChip
                    status={subscription?.status ?? "UNKNOWN"}
                    tone={subscription?.status === "ACTIVE" ? "lime" : "amber"}
                  />
                </View>
                <ListRow
                  title="Trial ends"
                  subtitle={formatLongDate(subscription?.trialEndAt)}
                  leading={<Ionicons name="timer-outline" size={20} color={palette.accent.fill} />}
                />
                <ListRow
                  title="Next billing"
                  subtitle={formatLongDate(subscription?.nextBillingAt)}
                  leading={<Ionicons name="calendar-outline" size={20} color={palette.accent.fill} />}
                />
                <ListRow
                  title="Active members"
                  subtitle={`${data.activeMemberCount} members currently count toward SaaS limits`}
                  leading={<Ionicons name="people-outline" size={20} color={palette.accent.fill} />}
                />
              </GlassCard>

              <GlassCard contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Mandate</Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      {mandate
                        ? `${titleCaseFromCode(mandate.status)} · ${formatInr(mandate.amountPaise)}`
                        : "No SaaS mandate is set up yet."}
                    </Text>
                  </View>
                  <StatusChip status={mandate?.status ?? "MISSING"} tone={mandate ? "lime" : "amber"} />
                </View>
                {mandate?.nextChargeAt ? (
                  <ListRow
                    title="Next charge"
                    subtitle={formatLongDate(mandate.nextChargeAt)}
                    leading={<Ionicons name="card-outline" size={20} color={palette.accent.fill} />}
                  />
                ) : null}
                <ZookButton
                  icon="card-outline"
                  busy={createMandate.isPending}
                  disabled={busy}
                  onPress={startMandateSetup}
                >
                  {mandate?.checkoutUrl ? "Resume setup" : "Set up mandate"}
                </ZookButton>
              </GlassCard>

              <GlassCard contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Upgrade plan</Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      Choose the same SaaS tiers used on web billing.
                    </Text>
                  </View>
                </View>
                <View style={styles.cycleRow}>
                  {(["MONTHLY", "YEARLY"] as BillingCycle[]).map((item) => (
                    <ZookButton
                      key={item}
                      size="sm"
                      tone={cycle === item ? "lime" : "secondary"}
                      onPress={() => setCycle(item)}
                    >
                      {titleCaseFromCode(item)}
                    </ZookButton>
                  ))}
                </View>
                {tiers.map((tier) => {
                  const price = data.pricing[tier]?.[cycle === "YEARLY" ? "yearly" : "monthly"] ?? 0;
                  return (
                    <View key={tier} style={styles.planRow}>
                      <View style={styles.rowCopy}>
                        <Text style={[styles.planTitle, { color: palette.text.primary }]}>
                          {titleCaseFromCode(tier)}
                        </Text>
                        <Text style={[styles.body, { color: palette.text.secondary }]}>
                          {formatInr(price)} / {cycle === "YEARLY" ? "year" : "month"}
                        </Text>
                      </View>
                      <ZookButton
                        size="sm"
                        busy={upgrade.isPending}
                        disabled={busy}
                        onPress={() => upgradeTier(tier)}
                      >
                        Select
                      </ZookButton>
                    </View>
                  );
                })}
              </GlassCard>

              <GlassCard contentStyle={styles.stack}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Current plan limits</Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  Limits are enforced for gym size, team size, branches, inventory, messages, and AI usage.
                </Text>
                <View style={styles.limitGrid}>
                  {[
                    ["Members", usageLine(data.usage?.activeMemberCount, data.entitlements?.memberLimit)],
                    ["Branches", usageLine(data.usage?.branchCount, data.entitlements?.branchLimit)],
                    ["Staff", usageLine(data.usage?.staffCount, data.entitlements?.staffLimit)],
                    ["Trainers", usageLine(data.usage?.trainerCount, data.entitlements?.trainerLimit)],
                    ["Products", usageLine(data.usage?.productCount, data.entitlements?.productLimit)],
                    [
                      "Messages",
                      usageLine(
                        data.usage?.notificationMonthlyCount,
                        data.entitlements?.notificationMonthlyLimit,
                      ),
                    ],
                    [
                      "AI text",
                      usageLine(data.usage?.aiTextMonthlyCount, data.entitlements?.aiTextMonthlyLimit),
                    ],
                    [
                      "AI images",
                      usageLine(data.usage?.aiImageMonthlyCount, data.entitlements?.aiImageMonthlyLimit),
                    ],
                  ].map(([label, value]) => (
                    <View key={label} style={[styles.limitCell, { borderColor: palette.border.subtle }]}>
                      <Text style={[styles.limitLabel, { color: palette.text.tertiary }]}>{label}</Text>
                      <Text style={[styles.limitValue, { color: palette.text.primary }]}>{value}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  Reports: {titleCaseFromCode(data.entitlements?.reports)} · Support:{" "}
                  {titleCaseFromCode(data.entitlements?.support)}
                </Text>
              </GlassCard>

              <GlassCard contentStyle={styles.stack}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Platform referral</Text>
                <Text selectable style={[styles.referralCode, { color: palette.text.primary }]}>
                  {data.platformReferral?.code ?? "Not available"}
                </Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {data.platformReferral?.referredCount ?? 0} gym referral partnerships recorded.
                </Text>
              </GlassCard>

              {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd ? (
                <ZookButton
                  tone="danger"
                  icon="close-circle-outline"
                  busy={cancel.isPending}
                  disabled={busy}
                  onPress={confirmCancel}
                >
                  Cancel at period end
                </ZookButton>
              ) : null}
            </>
          ) : null}
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: 96,
  },
  header: {
    gap: 5,
  },
  eyebrow: {
    ...typography.caption,
    textTransform: "uppercase",
  },
  title: {
    ...typography.screenTitle,
  },
  subtitle: {
    ...typography.body,
  },
  stack: {
    gap: spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  body: {
    ...typography.body,
  },
  cycleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planTitle: {
    ...typography.bodyStrong,
  },
  limitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  limitCell: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.sm,
    gap: 3,
  },
  limitLabel: {
    ...typography.caption,
    textTransform: "uppercase",
  },
  limitValue: {
    ...typography.bodyStrong,
  },
  referralCode: {
    ...typography.metric,
    fontVariant: ["tabular-nums"],
  },
});
