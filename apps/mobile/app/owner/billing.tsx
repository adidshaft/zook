import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  ListRow,
  ProfileShortcut,
  QueryErrorState,
  ScreenHeader,
  Skeleton,
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
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type Tier = "STARTER" | "GROWTH" | "PRO";
type BillingCycle = "MONTHLY" | "SEMIANNUAL" | "YEARLY";

const CYCLE_OPTIONS: BillingCycle[] = ["MONTHLY", "SEMIANNUAL", "YEARLY"];
const CYCLE_LABEL_KEY: Record<BillingCycle, TranslationKey> = {
  MONTHLY: "owner.billing.monthly",
  SEMIANNUAL: "owner.billing.sixMonths",
  YEARLY: "owner.billing.yearly",
};
const CYCLE_PERIOD_KEY: Record<BillingCycle, TranslationKey> = {
  MONTHLY: "owner.billing.month",
  SEMIANNUAL: "owner.billing.sixMonths",
  YEARLY: "owner.billing.year",
};
const CYCLE_PRICE_KEY: Record<BillingCycle, "monthly" | "semiannual" | "yearly"> = {
  MONTHLY: "monthly",
  SEMIANNUAL: "semiannual",
  YEARLY: "yearly",
};

const tiers: Tier[] = ["STARTER", "GROWTH", "PRO"];

function usageLine(used?: number, limit?: number | null) {
  return `${used ?? 0} / ${formatUsageLimit(limit)}`;
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
  const t = useT();
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
      showToast({ tone: "success", message: t("owner.billing.openingBillingSetup") });
      await openCheckout(result.checkoutUrl ?? result.mandate?.checkoutUrl);
    } catch (error) {
      showToast({
        tone: "danger",
        message: error instanceof Error ? error.message : t("owner.billing.couldNotStartBillingSetup"),
      });
    }
  }

  async function upgradeTier(tier: Tier) {
    try {
      const result = await upgrade.mutateAsync({ tier, billingCycle: cycle });
      showToast({ tone: "success", message: t("owner.billing.openingPlanCheckout") });
      await openCheckout(result.checkoutUrl ?? result.mandate?.checkoutUrl);
    } catch (error) {
      showToast({
        tone: "danger",
        message: error instanceof Error ? error.message : t("owner.billing.couldNotOpenPlanCheckout"),
      });
    }
  }

  function confirmCancel() {
    Alert.alert(t("owner.billing.cancelSubscriptionTitle"), t("owner.billing.cancelSubscriptionBody"), [
      { text: t("owner.billing.keep"), style: "cancel" },
      {
        text: t("owner.billing.cancel"),
        style: "destructive",
        onPress: () => {
          void cancel
            .mutateAsync()
            .then(() => {
              showToast({ tone: "success", message: t("owner.billing.cancellationRequested") });
            })
            .catch((error) => {
              showToast({
                tone: "danger",
                message: error instanceof Error ? error.message : t("owner.billing.couldNotCancelSubscription"),
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
            title={t("owner.billing.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip />
              </View>
            }
            trailing={<ProfileShortcut />}
          />

          {billingQuery.isError ? (
            <QueryErrorState error={billingQuery.error} onRetry={() => void billingQuery.refetch()} />
          ) : null}

          {billingQuery.isLoading && !data ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <Skeleton width="65%" height={18} borderRadius={9} />
              <Skeleton width="45%" height={14} borderRadius={7} />
              <Skeleton width="80%" height={14} borderRadius={7} />
            </Card>
          ) : null}

          {data ? (
            <>
              <Card contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>
                      {t("owner.billing.planName", { name: titleCaseFromCode(subscription?.tier) })}
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
                  title={t("owner.billing.trialEnds")}
                  subtitle={formatLongDate(subscription?.trialEndAt)}
                  leading={<Ionicons name="timer-outline" size={20} color={palette.accent.fill} />}
                />
                <ListRow
                  title={t("owner.billing.nextBilling")}
                  subtitle={formatLongDate(subscription?.nextBillingAt)}
                  leading={<Ionicons name="calendar-outline" size={20} color={palette.accent.fill} />}
                />
                <ListRow
                  title={t("owner.billing.activeMembers")}
                  subtitle={t("owner.billing.activeMembersCopy", {
                    count: data.activeMemberCount,
                    noun: data.activeMemberCount === 1 ? t("owner.billing.member") : t("owner.billing.members"),
                    verb: data.activeMemberCount === 1 ? t("owner.billing.counts") : t("owner.billing.count"),
                  })}
                  leading={<Ionicons name="people-outline" size={20} color={palette.accent.fill} />}
                />
              </Card>

              <Card contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("owner.billing.mandate")}</Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      {mandate
                        ? `${titleCaseFromCode(mandate.status)} · ${formatInr(mandate.amountPaise)}`
                        : t("owner.billing.noPaymentMandate")}
                    </Text>
                  </View>
                  <StatusChip
                    status={titleCaseFromCode(mandate?.status ?? "MISSING")}
                    tone={mandate ? toneForMandateStatus(mandate.status) : "amber"}
                  />
                </View>
                {mandate?.nextChargeAt ? (
                  <ListRow
                    title={t("owner.billing.nextCharge")}
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
                  {mandate?.checkoutUrl ? t("owner.billing.resumeSetup") : t("owner.billing.setUpMandate")}
                </ZookButton>
              </Card>

              <Card contentStyle={styles.stack}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("owner.billing.upgradePlan")}</Text>
                    <Text style={[styles.body, { color: palette.text.secondary }]}>
                      {t("owner.billing.upgradePlanBody")}
                    </Text>
                  </View>
                </View>
                <View style={styles.cycleRow}>
                  {CYCLE_OPTIONS.map((item) => (
                    <ZookButton
                      key={item}
                      size="sm"
                      variant={cycle === item ? "primary" : "secondary"}
                      onPress={() => setCycle(item)}
                    >
                      {t(CYCLE_LABEL_KEY[item])}
                    </ZookButton>
                  ))}
                </View>
                {tiers.map((tier) => {
                  const price = data.pricing[tier]?.[CYCLE_PRICE_KEY[cycle]] ?? 0;
                  return (
                    <View key={tier} style={styles.planRow}>
                      <View style={styles.rowCopy}>
                        <Text style={[styles.planTitle, { color: palette.text.primary }]}>
                          {titleCaseFromCode(tier)}
                        </Text>
                        <Text style={[styles.body, { color: palette.text.secondary }]}>
                          {formatInr(price)} / {t(CYCLE_PERIOD_KEY[cycle])}
                        </Text>
                      </View>
                      <ZookButton
                        size="sm"
                        busy={upgrade.isPending}
                        disabled={busy}
                        onPress={() => upgradeTier(tier)}
                      >
                        {t("owner.billing.select")}
                      </ZookButton>
                    </View>
                  );
                })}
              </Card>

              <Card contentStyle={styles.stack}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("owner.billing.currentPlanLimits")}</Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {t("owner.billing.currentPlanLimitsBody")}
                </Text>
                <View style={styles.limitGrid}>
                  {[
                    [t("owner.billing.members"), usageLine(data.usage?.activeMemberCount, data.entitlements?.memberLimit)],
                    [t("owner.billing.branches"), usageLine(data.usage?.branchCount, data.entitlements?.branchLimit)],
                    [t("owner.billing.staff"), usageLine(data.usage?.staffCount, data.entitlements?.staffLimit)],
                    [t("owner.billing.trainers"), usageLine(data.usage?.trainerCount, data.entitlements?.trainerLimit)],
                    [t("owner.billing.products"), usageLine(data.usage?.productCount, data.entitlements?.productLimit)],
                    [
                      t("owner.billing.messages"),
                      usageLine(
                        data.usage?.notificationMonthlyCount,
                        data.entitlements?.notificationMonthlyLimit,
                      ),
                    ],
                    [
                      t("owner.billing.aiText"),
                      usageLine(data.usage?.aiTextMonthlyCount, data.entitlements?.aiTextMonthlyLimit),
                    ],
                    [
                      t("owner.billing.aiImages"),
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
                  {t("owner.billing.reports")}: {titleCaseFromCode(data.entitlements?.reports)} · {t("owner.billing.support")}:{" "}
                  {titleCaseFromCode(data.entitlements?.support)}
                </Text>
              </Card>

              <Card contentStyle={styles.stack}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("owner.billing.platformReferral")}</Text>
                <Text selectable style={[styles.referralCode, { color: palette.text.primary }]}>
                  {data.platformReferral?.code ?? t("owner.billing.notAvailable")}
                </Text>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {t("owner.billing.referralPartnerships", {
                    count: data.platformReferral?.referredCount ?? 0,
                  })}
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
                  {t("owner.billing.cancelAtPeriodEnd")}
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
  loadingCard: {
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
