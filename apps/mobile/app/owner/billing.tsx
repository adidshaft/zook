import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  EmptyState,
  Card,
  ListRow,
  QueryErrorState,
  ScreenHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import {
  useCancelSaasSubscription,
  useCreateSaasBillingMandate,
  useOwnerBillingSubscription,
  useUpgradeSaasSubscription,
} from "@/lib/domains/owner";
import { formatInr, formatLongDate, formatUsageLimit, titleCaseFromCode, toneForSaasSubscriptionStatus } from "@/lib/formatting";
import { toWebUrl } from "@/lib/api";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type Tier = "STARTER" | "GROWTH" | "PRO";
type BillingCycle = "MONTHLY" | "YEARLY";

const tiers: Tier[] = ["STARTER", "GROWTH", "PRO"];

function usageLine(used?: number, limit?: number | null) {
  return `${used ?? 0} / ${formatUsageLimit(limit)}`;
}

function activeMembersCopy(count: number) {
  const noun = count === 1 ? "member" : "members";
  const verb = count === 1 ? "counts" : "count";
  return `${count} ${noun} currently ${verb} toward your plan limits`;
}

function toneForMandateStatus(status?: string | null) {
  if (status === "ACTIVE" || status === "AUTHENTICATED") {
    return "lime" as const;
  }
  if (status === "FAILED" || status === "CANCELLED") {
    return "red" as const;
  }
  if (status === "CREATED" || status === "PENDING" || status === "HALTED" || status === "PAUSED") {
    return "amber" as const;
  }
  return "neutral" as const;
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
    Alert.alert("Cancel subscription?", "The subscription is marked to cancel at period end.", [
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
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
          <ScreenHeader
            title="Billing"
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
          />

          {billingQuery.isError ? (
            <QueryErrorState error={billingQuery.error} onRetry={() => void billingQuery.refetch()} />
          ) : null}

          {!billingQuery.isError && !data ? (
            <EmptyState title="Loading billing" />
          ) : null}

          {data ? (
            <>
              <Card contentStyle={styles.stack}>
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
                    status={titleCaseFromCode(subscription?.status ?? "UNKNOWN")}
                    tone={toneForSaasSubscriptionStatus(subscription?.status)}
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
                  subtitle={activeMembersCopy(data.activeMemberCount)}
                  leading={<Ionicons name="people-outline" size={20} color={palette.accent.fill} />}
                />
              </Card>

              <Card contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Mandate</Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      {mandate
                        ? `${titleCaseFromCode(mandate.status)} · ${formatInr(mandate.amountPaise)}`
                        : "No payment mandate is set up yet."}
                    </Text>
                  </View>
                  <StatusChip
                    status={titleCaseFromCode(mandate?.status ?? "MISSING")}
                    tone={mandate ? toneForMandateStatus(mandate.status) : "amber"}
                  />
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
              </Card>

              <Card contentStyle={styles.stack}>
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
                      variant={cycle === item ? "primary" : "secondary"}
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
              </Card>

              <Card contentStyle={styles.stack}>
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
              </Card>

              <Card contentStyle={styles.stack}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Platform referral</Text>
                <Text selectable style={[styles.referralCode, { color: palette.text.primary }]}>
                  {data.platformReferral?.code ?? "Not available"}
                </Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {data.platformReferral?.referredCount ?? 0} gym referral partnerships recorded.
                </Text>
              </Card>

              {subscription?.status === "ACTIVE" && !subscription.cancelAtPeriodEnd ? (
                <ZookButton
                  variant="destructive"
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
  headerContext: {
    alignItems: "flex-start",
    gap: 6,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: 14,
    paddingBottom: 96,
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
