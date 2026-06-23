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
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useMyCoaching } from "@/lib/domains/member";
import { formatInr, formatRelativeDate } from "@/lib/formatting";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

export default function MemberCoaching() {
  const { palette } = useTheme();
  const router = useRouter();
  const coachingQuery = useMyCoaching();
  const [refreshing, setRefreshing] = useState(false);

  const data = coachingQuery.data;
  const subscription = data?.subscription ?? null;
  const total = subscription?.totalSessions ?? 0;
  const remaining = subscription?.remainingSessions ?? 0;
  const used = Math.max(0, total - remaining);
  const progress = total > 0 ? used / total : 0;

  async function refresh() {
    setRefreshing(true);
    await coachingQuery.refetch();
    setRefreshing(false);
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

          {!coachingQuery.isLoading && !subscription ? (
            <Card variant="compact">
              <EmptyState
                icon="barbell-outline"
                title="No active coaching"
                body="When you sign up for personal training, your plan and sessions show up here."
              />
            </Card>
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
});
