import { Stack, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  type AppStateStatus,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  Pill,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi, paymentsApi } from "@/lib/domain-api";
import { formatDateTime, formatInr, formatLongDate, titleCaseFromCode } from "@/lib/formatting";
import { useGymProfile, useMyMemberships, type PublicPlanSummary } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type MembershipRecord = {
  id: string;
  status?: string | null;
  endsAt?: string | null;
  remainingVisits?: number | null;
  createdAt?: string | null;
  planId?: string | null;
  plan?:
    | (PublicPlanSummary & {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      })
    | null;
  organization?: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  autopay?: AutopayRecord | null;
};

type RenewalResult = {
  checkoutUrl?: string | null;
  subscription?: unknown;
  session?: {
    id: string;
    status: string;
    provider?: string | null;
  } | null;
};

type AutopayRecord = {
  id: string;
  status?: string | null;
  checkoutUrl?: string | null;
  provider?: string | null;
  nextChargeAt?: string | null;
  currentEndAt?: string | null;
};

type AutopayResult = {
  checkoutUrl?: string | null;
  mandate?: AutopayRecord | null;
  session?: {
    id: string;
    status: string;
    provider?: string | null;
  } | null;
};

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

function toneForStatus(status?: string | null) {
  if (status === "ACTIVE") return "lime" as const;
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PAST_DUE")
    return "amber" as const;
  if (status === "EXPIRED" || status === "CANCELLED") return "red" as const;
  return "blue" as const;
}

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function planIdFor(subscription?: MembershipRecord | null) {
  return subscription?.plan?.id ?? subscription?.planId ?? undefined;
}

function checkoutUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : toWebUrl(url);
}

function subscriptionStatusRank(status?: string | null) {
  if (status === "ACTIVE") return 0;
  if (status === "PENDING_PAYMENT" || status === "PENDING") return 1;
  if (status === "PAUSED" || status === "PAST_DUE") return 2;
  return 3;
}

function subscriptionTimestamp(subscription: MembershipRecord) {
  return new Date(
    subscription.endsAt ?? subscription.createdAt ?? "1970-01-01T00:00:00.000Z",
  ).getTime();
}

function isAutopayLive(autopay?: AutopayRecord | null) {
  return Boolean(
    autopay &&
      ["CREATED", "AUTHENTICATED", "ACTIVE", "PENDING", "HALTED", "PAUSED"].includes(
        autopay.status ?? "",
      ),
  );
}

export default function MembershipScreen() {
  const routeParams = useLocalSearchParams<{
    focus?: string;
    notificationId?: string;
    subscriptionId?: string;
  }>();
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const membershipsQuery = useMyMemberships();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization ??
    null;
  const memberships = (membershipsQuery.data?.subscriptions ?? []) as MembershipRecord[];
  const payments = ((membershipsQuery.data?.payments ?? []) as PaymentRecord[]).slice(0, 5);
  const sortedSubscriptions = [...memberships].sort((left, right) => {
    if (left.id === routeParams.subscriptionId) return -1;
    if (right.id === routeParams.subscriptionId) return 1;
    const statusDelta = subscriptionStatusRank(left.status) - subscriptionStatusRank(right.status);
    if (statusDelta !== 0) return statusDelta;
    return subscriptionTimestamp(right) - subscriptionTimestamp(left);
  });
  const latestSubscription = sortedSubscriptions[0];
  const gymUsername =
    latestSubscription?.organization?.username ?? activeOrganization?.username ?? undefined;
  const gymQuery = useGymProfile(gymUsername ?? "");
  const availablePlans = gymQuery.data?.plans ?? [];
  const activeCount = memberships.filter((s) => s.status === "ACTIVE").length;
  const expiringSoonCount = memberships.filter((s) => {
    if (s.status !== "ACTIVE" || !s.endsAt) return false;
    const days = daysUntil(s.endsAt);
    return days !== null && days <= 30;
  }).length;
  const latestDaysLeft = latestSubscription ? daysUntil(latestSubscription.endsAt) : null;
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalTarget, setRenewalTarget] = useState<MembershipRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [renewalStatus, setRenewalStatus] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [autopayStatus, setAutopayStatus] = useState("");
  const [autopayBusy, setAutopayBusy] = useState(false);
  const refreshAfterCheckoutRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === selectedPlanId) ?? renewalTarget?.plan ?? null,
    [availablePlans, renewalTarget?.plan, selectedPlanId],
  );

  useEffect(() => {
    if (!renewalTarget) return;
    setSelectedPlanId(planIdFor(renewalTarget) ?? availablePlans[0]?.id);
  }, [availablePlans, renewalTarget]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = appStateRef.current === "inactive" || appStateRef.current === "background";
      appStateRef.current = nextState;
      if (nextState !== "active" || !wasAway || !refreshAfterCheckoutRef.current) {
        return;
      }
      refreshAfterCheckoutRef.current = false;
      setRenewalStatus("Refreshing membership status...");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]).finally(() => {
        setRenewalOpen(false);
        setRenewalStatus("");
      });
    });
    return () => subscription.remove();
  }, [queryClient]);

  function openRenewal(subscription: MembershipRecord) {
    setRenewalTarget(subscription);
    setRenewalStatus("");
    setRenewalOpen(true);
  }

  async function renewMembership() {
    if (!token || !renewalTarget) return;
    setRenewing(true);
    setRenewalStatus("");
    try {
      const result = await memberApi.renewMembership<RenewalResult>({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        subscriptionId: renewalTarget.id,
        ...(selectedPlanId ? { planId: selectedPlanId } : {}),
      });
      if (result.session?.provider === "mock") {
        await paymentsApi.completeMockPayment({
          token,
          sessionId: result.session.id,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
        });
        setRenewalStatus("Renewal confirmed.");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        setRenewalOpen(false);
        return;
      }
      const url = checkoutUrl(result.checkoutUrl);
      setRenewalStatus(url ? "Renewal payment started." : "Renewal request sent.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      if (url) {
        refreshAfterCheckoutRef.current = true;
        await Linking.openURL(url);
      }
    } catch (error) {
      setRenewalStatus(getApiErrorMessage(error));
    } finally {
      setRenewing(false);
    }
  }

  async function enableAutopay(subscription: MembershipRecord) {
    if (!token) return;
    setAutopayBusy(true);
    setAutopayStatus("");
    try {
      const result = await memberApi.enableAutopay<AutopayResult>({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        subscriptionId: subscription.id,
        ...(planIdFor(subscription) ? { planId: planIdFor(subscription) } : {}),
      });
      const url = checkoutUrl(result.checkoutUrl ?? result.mandate?.checkoutUrl);
      if (!url) {
        setAutopayStatus("Autopay is active.");
        await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
        return;
      }
      setAutopayStatus("Autopay authorization created.");
      await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
      refreshAfterCheckoutRef.current = true;
      await Linking.openURL(url);
    } catch (error) {
      setAutopayStatus(getApiErrorMessage(error));
    } finally {
      setAutopayBusy(false);
    }
  }

  async function cancelAutopay(subscription: MembershipRecord) {
    if (!token) return;
    setAutopayBusy(true);
    setAutopayStatus("");
    try {
      await memberApi.cancelAutopay({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        subscriptionId: subscription.id,
      });
      setAutopayStatus("Autopay cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["me", "memberships"] });
    } catch (error) {
      setAutopayStatus(getApiErrorMessage(error));
    } finally {
      setAutopayBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Membership"
            title="Your plans"
            subtitle={
              memberships.length
                ? `${activeCount} active · ${expiringSoonCount} expiring soon · ${memberships.length} total`
                : "No active plans"
            }
          />

          {routeParams.focus === "membership" ? (
            <GlassCard variant="selected" contentStyle={styles.calloutContent}>
              <IconBubble icon="notifications" tone="blue" size={36} />
              <View style={styles.calloutCopy}>
                <Text style={styles.calloutTitle}>Membership update</Text>
                <Text style={styles.calloutBody}>
                  {routeParams.subscriptionId
                    ? "Your subscription has been updated."
                    : "Showing your current status."}
                </Text>
              </View>
            </GlassCard>
          ) : null}

          {membershipsQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <IconBubble icon="hourglass-outline" tone="amber" size={36} />
              <Text style={styles.loadingText}>Loading memberships...</Text>
            </GlassCard>
          ) : null}

          {!membershipsQuery.isLoading && !memberships.length ? (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="card-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No memberships</Text>
                <Text style={styles.emptyBody}>
                  Browse gyms and purchase a membership to get started.
                </Text>
              </View>
              <ZookButton href="/find-gyms" icon="search-outline">
                Find gyms
              </ZookButton>
            </GlassCard>
          ) : null}

          {latestSubscription ? (
            <>
              <SectionHeader title="Latest membership" />
              <GlassCard
                variant={latestSubscription.status === "ACTIVE" ? "success" : "default"}
                contentStyle={styles.featuredContent}
              >
                <View style={styles.featuredHeader}>
                  <IconBubble
                    icon="card-outline"
                    tone={toneForStatus(latestSubscription.status)}
                    size={40}
                  />
                  <View style={styles.featuredCopy}>
                    <Text style={styles.featuredTitle}>
                      {latestSubscription.plan?.name ?? "Membership"}
                    </Text>
                    <Text style={styles.featuredOrg}>
                      {latestSubscription.organization?.name ?? activeOrganization?.name ?? "Gym"}
                    </Text>
                  </View>
                  <Pill tone={toneForStatus(latestSubscription.status)}>
                    {titleCaseFromCode(latestSubscription.status ?? "ACTIVE")}
                  </Pill>
                </View>

                {latestDaysLeft !== null ? (
                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.max(5, Math.min(100, (latestDaysLeft / 30) * 100))}%` },
                          latestDaysLeft <= 7 ? styles.progressFillWarning : null,
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabels}>
                      <Text
                        style={[
                          styles.progressText,
                          latestDaysLeft <= 7 ? styles.progressTextWarning : null,
                        ]}
                      >
                        {latestDaysLeft} day{latestDaysLeft !== 1 ? "s" : ""} left
                      </Text>
                      <Text style={styles.progressTextMuted}>
                        {latestSubscription.endsAt ? formatLongDate(latestSubscription.endsAt) : ""}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {latestSubscription.remainingVisits !== null &&
                latestSubscription.remainingVisits !== undefined ? (
                  <View style={styles.membershipMetaLine}>
                    <Ionicons name="walk-outline" size={14} color={colors.lime} />
                    <Text style={styles.membershipMetaText}>
                      {latestSubscription.remainingVisits} visits remaining
                    </Text>
                  </View>
                ) : null}

                <ZookButton onPress={() => openRenewal(latestSubscription)} icon="refresh-outline">
                  Renew or change plan
                </ZookButton>
              </GlassCard>

              <GlassCard variant="compact" contentStyle={styles.autopayContent}>
                <View style={styles.autopayHeader}>
                  <IconBubble
                    icon="repeat-outline"
                    tone={isAutopayLive(latestSubscription.autopay) ? "lime" : "blue"}
                    size={36}
                  />
                  <View style={styles.autopayCopy}>
                    <Text style={styles.autopayTitle}>Autopay</Text>
                    <Text style={styles.autopayBody}>
                      {isAutopayLive(latestSubscription.autopay)
                        ? latestSubscription.autopay?.nextChargeAt
                          ? `Next renewal ${formatLongDate(latestSubscription.autopay.nextChargeAt)}`
                          : "Recurring renewal is enabled."
                        : "Authorize Razorpay test mode to renew this plan automatically."}
                    </Text>
                    {autopayStatus ? (
                      <Text style={styles.autopayStatus}>{autopayStatus}</Text>
                    ) : null}
                  </View>
                  <Pill tone={isAutopayLive(latestSubscription.autopay) ? "lime" : "blue"}>
                    {isAutopayLive(latestSubscription.autopay)
                      ? titleCaseFromCode(latestSubscription.autopay?.status ?? "ACTIVE")
                      : "Off"}
                  </Pill>
                </View>
                {isAutopayLive(latestSubscription.autopay) ? (
                  <ZookButton
                    tone="secondary"
                    disabled={autopayBusy}
                    onPress={() => void cancelAutopay(latestSubscription)}
                    icon="close-circle-outline"
                  >
                    {autopayBusy ? "Updating..." : "Cancel autopay"}
                  </ZookButton>
                ) : (
                  <ZookButton
                    disabled={autopayBusy || latestSubscription.status !== "ACTIVE"}
                    onPress={() => void enableAutopay(latestSubscription)}
                    icon="repeat-outline"
                  >
                    {autopayBusy ? "Starting..." : "Enable autopay"}
                  </ZookButton>
                )}
              </GlassCard>
            </>
          ) : null}

          {sortedSubscriptions.length > 1 ? (
            <>
              <SectionHeader title="History" />
              <View style={styles.stack}>
                {sortedSubscriptions.slice(1).map((subscription) => (
                  <GlassCard
                    key={subscription.id}
                    variant="compact"
                    contentStyle={styles.historyContent}
                  >
                    <View style={styles.historyRow}>
                      <View style={styles.historyCopy}>
                        <Text numberOfLines={1} style={styles.historyTitle}>
                          {subscription.plan?.name ?? "Membership"}
                        </Text>
                        <Text numberOfLines={1} style={styles.historyBody}>
                          {subscription.organization?.name ?? "Gym"} ·{" "}
                          {subscription.endsAt ? formatLongDate(subscription.endsAt) : "No expiry"}
                        </Text>
                      </View>
                      <Pill tone={toneForStatus(subscription.status)}>
                        {titleCaseFromCode(subscription.status ?? "ACTIVE")}
                      </Pill>
                    </View>
                  </GlassCard>
                ))}
              </View>
            </>
          ) : null}

          <SectionHeader title="Payments" />
          {payments.length ? (
            <View style={styles.stack}>
              {payments.map((payment) => (
                <GlassCard key={payment.id} variant="compact" contentStyle={styles.paymentContent}>
                  <View style={styles.paymentIcon}>
                    <IconBubble icon="receipt-outline" tone="lime" size={34} />
                  </View>
                  <View style={styles.paymentCopy}>
                    <View style={styles.paymentHeader}>
                      <Text numberOfLines={1} style={styles.paymentTitle}>
                        {titleCaseFromCode(payment.purpose ?? "PAYMENT")}
                      </Text>
                      <Text style={styles.paymentAmount}>{formatInr(payment.amountPaise)}</Text>
                    </View>
                    <Text numberOfLines={1} style={styles.paymentBody}>
                      {titleCaseFromCode(payment.mode ?? "ONLINE")} ·{" "}
                      {formatDateTime(payment.recordedAt ?? payment.createdAt)}
                    </Text>
                    <Pill tone={payment.status === "SUCCEEDED" ? "lime" : toneForStatus(payment.status)}>
                      {titleCaseFromCode(payment.status ?? "CREATED")}
                    </Pill>
                  </View>
                </GlassCard>
              ))}
            </View>
          ) : (
            <GlassCard variant="compact" contentStyle={styles.emptyPaymentContent}>
              <IconBubble icon="receipt-outline" tone="neutral" size={36} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No payments yet</Text>
                <Text style={styles.emptyBody}>Transaction history will appear here.</Text>
              </View>
            </GlassCard>
          )}
        </ScrollView>
        <BottomNav />
        <RenewalSheet
          availablePlans={availablePlans}
          currentPlan={renewalTarget?.plan ?? null}
          gymName={renewalTarget?.organization?.name ?? activeOrganization?.name ?? "your gym"}
          loadingPlans={gymQuery.isLoading}
          onClose={() => setRenewalOpen(false)}
          onRenew={() => void renewMembership()}
          open={renewalOpen}
          renewing={renewing}
          selectedPlan={selectedPlan}
          selectedPlanId={selectedPlanId}
          setSelectedPlanId={setSelectedPlanId}
          status={renewalStatus}
        />
      </ZookScreen>
    </>
  );
}

function RenewalSheet({
  availablePlans,
  currentPlan,
  gymName,
  loadingPlans,
  onClose,
  onRenew,
  open,
  renewing,
  selectedPlan,
  selectedPlanId,
  setSelectedPlanId,
  status,
}: {
  availablePlans: PublicPlanSummary[];
  currentPlan: MembershipRecord["plan"];
  gymName: string;
  loadingPlans: boolean;
  onClose: () => void;
  onRenew: () => void;
  open: boolean;
  renewing: boolean;
  selectedPlan: PublicPlanSummary | MembershipRecord["plan"] | null;
  selectedPlanId?: string;
  setSelectedPlanId: (planId: string) => void;
  status: string;
}) {
  const insets = useSafeAreaInsets();
  const plans = availablePlans.length
    ? availablePlans
    : currentPlan?.id
      ? [currentPlan as PublicPlanSummary]
      : [];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close renewal sheet"
        />
        <View
          style={[
            styles.sheet,
            {
              maxHeight: "88%",
              paddingBottom: Math.max(insets.bottom + spacing.md, spacing.lg),
            },
          ]}
        >
          <View style={styles.sheetGrabber} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleCopy}>
              <Text style={styles.sheetEyebrow}>Renew membership</Text>
              <Text style={styles.sheetTitle}>
                {selectedPlan?.name ?? currentPlan?.name ?? "Current plan"}
              </Text>
              <Text style={styles.sheetBody}>
                Continue at {gymName} with the same plan or choose another available option.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.planSelectorScroll}
            contentContainerStyle={styles.planSelector}
            showsVerticalScrollIndicator={false}
          >
            {loadingPlans ? <Text style={styles.loadingText}>Loading plan options...</Text> : null}
            {!loadingPlans && !plans.length ? (
              <Text style={styles.emptyBody}>
                No alternate plans are published yet. Same-plan renewal will be requested.
              </Text>
            ) : null}
            {plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${plan.name}`}
                  style={[styles.planOption, selected ? styles.planOptionSelected : null]}
                >
                  <View style={styles.planOptionCopy}>
                    <Text style={styles.planOptionTitle}>{plan.name}</Text>
                    <Text style={styles.planOptionMeta}>
                      {titleCaseFromCode(plan.type ?? "MEMBERSHIP")} · {formatInr(plan.pricePaise)}
                    </Text>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedPlan ? (
            <GlassCard variant="compact" contentStyle={styles.renewalSummary}>
              <Text style={styles.summaryTitle}>Renewal summary</Text>
              <Text style={styles.summaryBody}>
                {selectedPlan.durationDays
                  ? `${selectedPlan.durationDays} days`
                  : "Gym-defined validity"}
                {selectedPlan.visitLimit ? ` · ${selectedPlan.visitLimit} visits` : ""}
              </Text>
            </GlassCard>
          ) : null}

          {status ? <Text style={styles.statusMessage}>{status}</Text> : null}
          <View style={styles.sheetActions}>
            <ZookButton tone="secondary" onPress={onClose} style={styles.actionHalf}>
              Cancel
            </ZookButton>
            <ZookButton
              onPress={onRenew}
              disabled={renewing}
              icon="refresh-outline"
              style={styles.actionHalf}
            >
              {renewing ? "Starting..." : "Continue to payment"}
            </ZookButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calloutCopy: {
    flex: 1,
    gap: 4,
  },
  calloutTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  calloutBody: {
    color: colors.muted,
    ...typography.body,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    ...typography.body,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  featuredContent: {
    gap: spacing.md,
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  featuredCopy: {
    flex: 1,
    gap: 4,
  },
  featuredTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  featuredOrg: {
    color: colors.muted,
    ...typography.body,
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.lime,
  },
  progressFillWarning: {
    backgroundColor: colors.amber,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: colors.lime,
    ...typography.caption,
  },
  progressTextWarning: {
    color: colors.amber,
  },
  progressTextMuted: {
    color: colors.muted,
    ...typography.small,
  },
  membershipMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  membershipMetaText: {
    color: colors.text,
    ...typography.caption,
  },
  autopayContent: {
    gap: spacing.md,
  },
  autopayHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  autopayCopy: {
    flex: 1,
    gap: 4,
  },
  autopayTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  autopayBody: {
    color: colors.muted,
    ...typography.small,
  },
  autopayStatus: {
    color: colors.lime,
    ...typography.small,
  },
  stack: {
    gap: 8,
  },
  historyContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  historyCopy: {
    flex: 1,
    gap: 4,
  },
  historyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  historyBody: {
    color: colors.muted,
    ...typography.small,
  },
  emptyPaymentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  paymentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paymentIcon: {
    alignSelf: "flex-start",
  },
  paymentCopy: {
    flex: 1,
    gap: 6,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentTitle: {
    flex: 1,
    color: colors.text,
    ...typography.cardTitle,
  },
  paymentAmount: {
    color: colors.text,
    ...typography.cardTitle,
  },
  paymentBody: {
    color: colors.muted,
    ...typography.small,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.72)",
  },
  sheet: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetGrabber: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 5,
  },
  sheetEyebrow: {
    color: colors.lime,
    ...typography.eyebrow,
  },
  sheetTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  sheetBody: {
    color: colors.muted,
    ...typography.body,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  planSelector: {
    gap: spacing.sm,
  },
  planSelectorScroll: {
    maxHeight: 310,
  },
  planOption: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: spacing.md,
  },
  planOptionSelected: {
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.11)",
  },
  planOptionCopy: {
    flex: 1,
    gap: 4,
  },
  planOptionTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  planOptionMeta: {
    color: colors.muted,
    ...typography.small,
  },
  renewalSummary: {
    gap: 4,
  },
  summaryTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  summaryBody: {
    color: colors.muted,
    ...typography.small,
  },
  statusMessage: {
    color: colors.lime,
    ...typography.small,
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
});
