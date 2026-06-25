import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  IconBubble,
  Pill,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useBrowsePtPlans, useMyCoaching, useRequestPtSubscription } from "@/lib/domains/member";
import type { PtPlanRecord } from "@/lib/domains/shared/types";
import { formatInr, formatRelativeDate } from "@/lib/formatting";
import { getApiErrorMessage } from "@/lib/auth";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

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
  return (
    <Card contentStyle={styles.planCard}>
      <View style={styles.planHeader}>
        <IconBubble icon="barbell-outline" tone="lime" size={42} />
        <View style={styles.planCopy}>
          <Text style={[styles.planName, { color: palette.text.primary }]} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={[styles.planMeta, { color: palette.text.secondary }]} numberOfLines={1}>
            {plan.trainerName ?? "Trainer"}
            {plan.sessionCount ? ` · ${plan.sessionCount} sessions` : ""}
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
        <Pill tone="amber">Request sent — a trainer will confirm</Pill>
      ) : (
        <ZookButton
          size="sm"
          variant="secondary"
          icon="paper-plane-outline"
          busy={requesting}
          busyLabel="Requesting..."
          onPress={onRequest}
        >
          Request this package
        </ZookButton>
      )}
    </Card>
  );
}

export default function MemberCoaching() {
  const { palette } = useTheme();
  const router = useRouter();
  const coachingQuery = useMyCoaching();
  const plansQuery = useBrowsePtPlans();
  const requestSubscription = useRequestPtSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const [requestedPlanIds, setRequestedPlanIds] = useState<string[]>([]);

  const data = coachingQuery.data;
  const subscription = data?.subscription ?? null;
  const total = subscription?.totalSessions ?? 0;
  const remaining = subscription?.remainingSessions ?? 0;
  const used = Math.max(0, total - remaining);
  const progress = total > 0 ? used / total : 0;
  const plans = plansQuery.data?.plans ?? [];

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
          <AppHeader title="Your coaching" subtitle="Personal training with your coach." showBack />

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
              <Card variant="compact">
                <EmptyState
                  icon="barbell-outline"
                  title="No active coaching"
                  body="Browse PT packages below and request one — a trainer will confirm and collect payment."
                />
              </Card>

              <SectionHeader title="Browse PT packages" />

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
                    title="No packages available"
                    body="Check back later — trainers haven't published PT packages yet."
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

          {subscription ? (
            <>
              <Card contentStyle={styles.coachCard}>
                <View style={styles.coachRow}>
                  <IconBubble icon="person" tone="lime" size={52} />
                  <View style={styles.coachCopy}>
                    <Text style={[styles.coachLabel, { color: palette.text.secondary }]}>Your coach</Text>
                    <Text style={[styles.coachName, { color: palette.text.primary }]} numberOfLines={1}>
                      {data?.trainer?.name ?? "Your trainer"}
                    </Text>
                  </View>
                  <Pill tone={subscription.status === "ACTIVE" ? "lime" : "amber"}>
                    {subscription.status === "ACTIVE" ? "Active" : "Pending"}
                  </Pill>
                </View>
                {subscription.planName ? (
                  <Text style={[styles.planName, { color: palette.text.primary }]}>{subscription.planName}</Text>
                ) : null}
                {data?.plan?.description ? (
                  <Text style={[styles.planDesc, { color: palette.text.secondary }]}>{data.plan.description}</Text>
                ) : null}
                <ProgressBar value={progress} tone="lime" label={`${remaining} of ${total} sessions left`} />
                <View style={styles.metaRow}>
                  <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                    {used} completed
                  </Text>
                  {subscription.endsAt ? (
                    <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                      Ends {formatRelativeDate(subscription.endsAt)}
                    </Text>
                  ) : null}
                  <Text style={[styles.metaText, { color: palette.text.secondary }]}>
                    {formatInr(subscription.amountPaise)}
                  </Text>
                </View>
              </Card>

              <ZookButton variant="secondary" icon="restaurant-outline" onPress={() => router.push("/plan?tab=diet" as never)}>
                View my diet plan
              </ZookButton>

              <SectionHeader title="Recent sessions" />
              {data && data.sessions.length === 0 ? (
                <Card variant="compact">
                  <EmptyState icon="time-outline" title="No sessions yet" body="Your logged sessions will appear here." />
                </Card>
              ) : null}
              <View style={styles.stack}>
                {data?.sessions.map((session) => (
                  <Card key={session.id} variant="compact" contentStyle={styles.sessionCard}>
                    <IconBubble icon="checkmark-done" tone="blue" size={40} />
                    <View style={styles.sessionCopy}>
                      <Text style={[styles.sessionTitle, { color: palette.text.primary }]} numberOfLines={1}>
                        {session.notes ?? "Training session"}
                      </Text>
                      <Text style={[styles.sessionMeta, { color: palette.text.secondary }]}>
                        {formatRelativeDate(session.sessionAt)}
                      </Text>
                    </View>
                  </Card>
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
  coachLabel: { ...typography.caption },
  coachName: { ...typography.cardTitle },
  planName: { ...typography.cardTitle },
  planDesc: { ...typography.small, marginTop: -spacing.sm },
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
  loadingCard: { gap: spacing.md },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  loadingCopy: { flex: 1, gap: 8 },
});
