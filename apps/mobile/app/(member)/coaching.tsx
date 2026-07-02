import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ScreenHeader,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useBrowsePtPlans, useMyCoaching, useRequestPtSubscription } from "@/lib/domains/member";
import type { PtPlanRecord } from "@/lib/domains/shared/types";
import { formatInr } from "@/lib/formatting";
import { useFormatters } from "@/lib/formatting-i18n";
import { getApiErrorMessage } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type CoachingTab = "current" | "packages";

function PtPlanCard({
  plan,
  requesting,
  requested,
  onRequest,
}: {
  plan: PtPlanRecord;
  requesting: boolean;
  requested: boolean;
  onRequest: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  const sessionsLabel = plan.sessionCount
    ? t("member.coaching.sessionsCount", { count: plan.sessionCount })
    : t("member.coaching.flexibleSessions");
  return (
    <Card contentStyle={styles.planCard}>
      <View style={styles.planHeader}>
        <IconBubble icon="barbell-outline" tone="lime" size={42} />
        <View style={styles.planCopy}>
          <Text style={[styles.planName, { color: palette.text.primary }]} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={[styles.planMeta, { color: palette.text.secondary }]} numberOfLines={1}>
            {sessionsLabel}
            {plan.trainerName ? ` · ${plan.trainerName}` : ""}
          </Text>
        </View>
        <Text style={[styles.planPrice, { color: palette.text.primary }]}>{formatInr(plan.pricePaise)}</Text>
      </View>
      {plan.description ? (
        <Text style={[styles.planCardDesc, { color: palette.text.secondary }]} numberOfLines={2}>
          {plan.description}
        </Text>
      ) : null}
      {requested ? (
        <Pill tone="amber">{t("member.coaching.requestSent")}</Pill>
      ) : (
        <View style={styles.planActionRow}>
          <Text style={[styles.planPaymentHint, { color: palette.text.tertiary }]} numberOfLines={1}>
            {t("member.coaching.payAfterApproval")}
          </Text>
          <ZookButton
            size="sm"
            variant="primary"
            icon="paper-plane-outline"
            busy={requesting}
            busyLabel={t("member.coaching.requesting")}
            onPress={onRequest}
            style={styles.planAction}
          >
            {t("member.coaching.requestPackage")}
          </ZookButton>
        </View>
      )}
    </Card>
  );
}

export default function MemberCoaching() {
  const { palette } = useTheme();
  const t = useT();
  const { formatRelativeDate } = useFormatters();
  const router = useRouter();
  const coachingQuery = useMyCoaching();
  const plansQuery = useBrowsePtPlans();
  const requestSubscription = useRequestPtSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [requestedPlanIds, setRequestedPlanIds] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<CoachingTab>("packages");

  const data = coachingQuery.data;
  const subscription = data?.subscription ?? null;
  const subscriptionId = subscription?.id;
  const total = subscription?.totalSessions ?? 0;
  const remaining = subscription?.remainingSessions ?? 0;
  const used = Math.max(0, total - remaining);
  const progress = total > 0 ? used / total : 0;
  const plans = plansQuery.data?.plans ?? [];
  const visibleTab = subscription ? selectedTab : selectedTab === "current" ? "packages" : selectedTab;
  const tabOptions: Array<{ label: string; value: CoachingTab }> = [
    { label: t("member.coaching.currentTab"), value: "current" },
    { label: t("member.coaching.packagesTab"), value: "packages" },
  ];

  useEffect(() => {
    if (subscriptionId) {
      setSelectedTab("current");
    }
  }, [subscriptionId]);

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([coachingQuery.refetch(), plansQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  function requestPlan(plan: PtPlanRecord) {
    requestSubscription.mutate(
      {
        ptPlanId: plan.id,
        trainerUserId: plan.trainerUserId,
        amountPaise: plan.pricePaise,
        ...(plan.sessionCount ? { totalSessions: plan.sessionCount } : {}),
      },
      {
        onSuccess: () => setRequestedPlanIds((current) => [...current, plan.id]),
        onError: (error) => showToast({ tone: "danger", haptic: "error", message: getApiErrorMessage(error) }),
      },
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-coaching-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader title={t("member.coaching.title")} showBack />

          {coachingQuery.isError ? (
            <QueryErrorState error={coachingQuery.error} onRetry={() => void coachingQuery.refetch()} />
          ) : null}

          {coachingQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.loadingCard}>
              <View style={styles.loadingRow}>
                <Skeleton width={52} height={52} borderRadius={26} />
                <View style={styles.loadingCopy}>
                  <Skeleton width="50%" height={16} borderRadius={8} />
                  <Skeleton width="35%" height={12} borderRadius={6} />
                </View>
              </View>
              <Skeleton width="100%" height={8} borderRadius={4} />
            </Card>
          ) : null}

          {!coachingQuery.isLoading && !subscription ? (
            <>
              <SegmentedControl options={tabOptions} value={visibleTab} onChange={setSelectedTab} />

              {visibleTab === "current" ? (
                <Card variant="compact">
                  <EmptyState
                    icon="barbell-outline"
                    title={t("member.coaching.noActiveCoaching")}
                    body={t("member.coaching.noActiveCoachingBody")}
                  />
                </Card>
              ) : null}

              {visibleTab === "packages" ? (
                <>
                  <SectionHeader title={t("member.coaching.browsePtPackages")} />

                  {plansQuery.isError ? (
                    <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} />
                  ) : null}

                  {plansQuery.isLoading && !plansQuery.data ? (
                    <Card variant="compact" contentStyle={styles.loadingCard}>
                      <Skeleton width="55%" height={18} borderRadius={9} />
                      <Skeleton width="80%" height={14} borderRadius={7} />
                      <Skeleton width="70%" height={14} borderRadius={7} />
                    </Card>
                  ) : null}

                  {!plansQuery.isLoading && plans.length === 0 && !plansQuery.isError ? (
                    <Card variant="compact">
                      <EmptyState
                        icon="pricetag-outline"
                        title={t("member.coaching.noPackagesAvailable")}
                        body={t("member.coaching.noPackagesAvailableBody")}
                      />
                    </Card>
                  ) : null}

                  <View style={styles.stack}>
                    {plans.map((plan) => (
                      <PtPlanCard
                        key={plan.id}
                        plan={plan}
                        requesting={requestSubscription.isPending && requestSubscription.variables?.ptPlanId === plan.id}
                        requested={requestedPlanIds.includes(plan.id)}
                        onRequest={() => requestPlan(plan)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {subscription ? (
            <>
              <SegmentedControl options={tabOptions} value={visibleTab} onChange={setSelectedTab} />

              {visibleTab === "current" ? (
                <>
                  <Card contentStyle={styles.coachCard}>
                    <View style={styles.coachRow}>
                      <IconBubble icon="person" tone="lime" size={52} />
                      <View style={styles.coachCopy}>
                        <Text style={[styles.coachName, { color: palette.text.primary }]} numberOfLines={1}>
                          {data?.trainer?.name ?? t("member.coaching.yourTrainer")}
                        </Text>
                        {subscription.planName ? (
                          <Text style={[styles.coachPlan, { color: palette.text.secondary }]} numberOfLines={1}>
                            {subscription.planName}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.coachActions}>
                        <Pill tone={subscription.status === "ACTIVE" ? "lime" : "amber"}>
                          {subscription.status === "ACTIVE" ? t("member.coaching.active") : t("member.coaching.pending")}
                        </Pill>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("member.coaching.viewDietPlan")}
                          onPress={() => router.push("/plan?tab=diet" as never)}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.dietAction,
                            {
                              backgroundColor: palette.bg.sunken,
                              borderColor: palette.border.default,
                            },
                            pressed ? styles.dietActionPressed : null,
                          ]}
                        >
                          <Ionicons name="restaurant-outline" size={17} color={palette.text.primary} />
                        </Pressable>
                      </View>
                    </View>
                    {data?.plan?.description ? (
                      <Text style={[styles.coachPlan, { color: palette.text.secondary }]} numberOfLines={1}>
                        {data.plan.description}
                      </Text>
                    ) : null}
                    <ProgressBar
                      value={progress}
                      tone="lime"
                      label={t("member.coaching.sessionsLeft", { remaining, total })}
                    />
                    <View style={styles.metaRow}>
                      {subscription.endsAt ? (
                        <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                          {t("member.coaching.ends", { date: formatRelativeDate(subscription.endsAt) })}
                        </Text>
                      ) : null}
                      <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                        {formatInr(subscription.amountPaise)}
                      </Text>
                    </View>
                  </Card>

                  <SectionHeader title={t("member.coaching.recentSessions")} />
                  {data && data.sessions.length === 0 ? (
                    <Card variant="compact">
                      <EmptyState
                        icon="time-outline"
                        title={t("member.coaching.noSessionsYet")}
                        body={t("member.coaching.noSessionsYetBody")}
                      />
                    </Card>
                  ) : null}
                  <View style={styles.stack}>
                    {data?.sessions.map((session) => (
                      <Card key={session.id} variant="compact" contentStyle={styles.sessionCard}>
                        <IconBubble icon="checkmark-done" tone="blue" size={40} />
                        <View style={styles.sessionCopy}>
                          <Text style={[styles.sessionTitle, { color: palette.text.primary }]} numberOfLines={1}>
                            {session.notes ?? t("member.coaching.trainingSession")}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.sessionMeta, { color: palette.text.secondary }]}
                          >
                            {formatRelativeDate(session.sessionAt)}
                          </Text>
                        </View>
                      </Card>
                    ))}
                  </View>
                </>
              ) : null}

              {visibleTab === "packages" ? (
                <>
                  <SectionHeader title={t("member.coaching.browsePtPackages")} />
                  <View style={styles.stack}>
                    {plans.map((plan) => (
                      <PtPlanCard
                        key={plan.id}
                        plan={plan}
                        requesting={requestSubscription.isPending && requestSubscription.variables?.ptPlanId === plan.id}
                        requested={requestedPlanIds.includes(plan.id)}
                        onRequest={() => requestPlan(plan)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
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
  coachCard: { gap: spacing.md },
  coachRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  coachCopy: { flex: 1, gap: 2, minWidth: 0 },
  coachName: { ...typography.cardTitle },
  coachPlan: { ...typography.small },
  coachActions: { alignItems: "flex-end", gap: spacing.xs },
  dietAction: {
    alignItems: "center",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  dietActionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  planName: { ...typography.cardTitle },
  planDesc: { ...typography.small },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metaText: { ...typography.small },
  stack: { gap: spacing.sm },
  sessionCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  sessionCopy: { flex: 1, gap: 2, minWidth: 0 },
  sessionTitle: { ...typography.bodyStrong },
  sessionMeta: { ...typography.small },
  planCard: { gap: spacing.sm },
  planHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  planCopy: { flex: 1, gap: 2, minWidth: 0 },
  planMeta: { ...typography.small },
  planPrice: { ...typography.cardTitle },
  planCardDesc: { ...typography.small },
  planActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  planPaymentHint: { ...typography.caption, flex: 1, minWidth: 0 },
  planAction: { flexShrink: 0 },
  loadingCard: { gap: spacing.md },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  loadingCopy: { flex: 1, gap: 8 },
});
