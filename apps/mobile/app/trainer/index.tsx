import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AttentionCard } from "@/components/domain/attention";
import { MetricGrid } from "@/components/domain/metric-grid";
import {
  AnimatedAppear,
  EmptyState,
  Card,
  HeaderActions,
  HeaderMeta,
  ListRow,
  OperationalQueueCard,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { fitnessGoalFor } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { useTrainerClients } from "@/lib/domains";
import { formatBranchName } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerHomeScreen() {
  const { palette } = useTheme();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomScrollPadding();
  const { activeOrgId, session } = useAuth();
  const roleContext = useRoleContext();
  const { selectedBranch } = useBranchSelection();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const plannedClients = clients.filter((client) => (client.summary?.activePlans ?? 0) > 0);
  const clientsNeedingPlans = Math.max(clients.length - plannedClients.length, 0);
  const recentFeedback = clients
    .flatMap((client) =>
      (client.summary?.recentFeedback ?? []).map((feedback) => ({
        ...feedback,
        clientId: client.memberUserId,
        clientName: client.user?.name ?? t("trainer.home.clientFallback"),
      })),
    )
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, 3);
  const priorityClient = plannedClients[0] ?? clients[0];
  const orgName = roleContext?.org?.name ?? session?.user.name ?? t("trainer.home.trainerFallback");
  const branchLabel = formatBranchName(orgName, selectedBranch?.name ?? null, {
    collapseOrgMatch: true,
  });
  const headerSubtitle = branchLabel ?? orgName;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader
            title={t("trainer.home.today")}
            subtitle={headerSubtitle}
            meta={
              <View style={styles.headerMetaRow}>
                {branchLabel ? (
                  <HeaderMeta icon="business-outline">{orgName}</HeaderMeta>
                ) : null}
                {session?.user.name ? (
                  <HeaderMeta icon="person-outline">{session.user.name}</HeaderMeta>
                ) : null}
              </View>
            }
            scrollY={scrollY}
            trailing={<HeaderActions showBell />}
          />

          {clientsQuery.isLoading ? <TrainerClientsSkeleton /> : null}
          {clientsQuery.isError ? <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} /> : null}

          <AnimatedAppear delay={0}>
            <Card variant="compact" contentStyle={styles.stack}>
              {priorityClient ? (
                <Pressable
                  testID="trainer-client-row-first"
                  accessibilityRole="button"
                  onPress={() => router.push(`/trainer/clients/${priorityClient.memberUserId}` as never)}
                  style={({ pressed }) => (pressed ? styles.rowPressed : null)}
                >
                  <ListRow
                    title={priorityClient.user?.name ?? t("trainer.home.clientFallback")}
                    subtitle={t("trainer.home.clientPlanSubtitle", {
                      count: priorityClient.summary?.activePlans ?? 0,
                      label: (priorityClient.summary?.activePlans ?? 0) === 1 ? t("trainer.home.plan") : t("trainer.home.plans"),
                      goal: fitnessGoalFor(priorityClient),
                    })}
                  />
                </Pressable>
              ) : (
                <EmptyState
                  icon="checkmark-done-outline"
                  title={t("trainer.home.noCoachingActions")}
                  body={t("trainer.home.noCoachingActionsBody")}
                />
              )}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={30}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("trainer.home.openPersonalTraining")}
              onPress={() => router.push("/trainer/pt" as never)}
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <Card variant="compact" contentStyle={styles.stack}>
                <ListRow
                  title={t("trainer.home.personalTraining")}
                  subtitle={t("trainer.home.personalTrainingSubtitle")}
                  icon="barbell-outline"
                  trailing={
                    <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
                  }
                />
              </Card>
            </Pressable>
          </AnimatedAppear>

          <AnimatedAppear delay={35}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("trainer.home.openClasses")}
              onPress={() => router.push("/trainer/classes" as never)}
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <Card variant="compact" contentStyle={styles.stack}>
                <ListRow
                  title={t("trainer.home.classes")}
                  subtitle={t("trainer.home.classesSubtitle")}
                  icon="calendar-outline"
                  trailing={
                    <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
                  }
                />
              </Card>
            </Pressable>
          </AnimatedAppear>

          <AnimatedAppear delay={38}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("trainer.home.referGymAccessibility")}
              onPress={() => router.push("/rewards" as never)}
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <Card variant="compact" contentStyle={styles.stack}>
                <ListRow
                  title={t("trainer.home.referGym")}
                  subtitle={t("trainer.home.referGymSubtitle")}
                  icon="gift-outline"
                  trailing={
                    <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
                  }
                />
              </Card>
            </Pressable>
          </AnimatedAppear>

          <AnimatedAppear delay={40}>
            <SectionHeader title={t("trainer.home.needsPlan")} />
            {clientsNeedingPlans ? (
              <OperationalQueueCard
                title={t("trainer.home.clientsNeedPlan", {
                  count: clientsNeedingPlans,
                  label: clientsNeedingPlans === 1 ? t("trainer.home.client") : t("trainer.home.clients"),
                })}
                meta={t("trainer.home.trainerPlanningQueue")}
                status={t("trainer.home.createPlanNext")}
                tone="amber"
                icon="reader-outline"
                actionLabel={t("trainer.home.openClients")}
                onPress={() => router.push("/trainer/clients" as never)}
              />
            ) : (
              <Card variant="compact" contentStyle={styles.stack}>
                <EmptyState
                  icon="clipboard-outline"
                  title={t("trainer.home.planQueueClear")}
                  body={t("trainer.home.planQueueClearBody")}
                />
              </Card>
            )}
          </AnimatedAppear>

          <AnimatedAppear delay={80}>
            <MetricGrid
              testID="trainer-view-home"
              items={[
              {
                label: t("trainer.home.clients"),
                value: clients.length,
                tone: "blue",
              },
              {
                label: t("trainer.home.activePlans"),
                value: plannedClients.length,
                tone: "blue",
              },
              {
                label: t("trainer.home.needsPlan"),
                value: clientsNeedingPlans,
                tone: "amber",
              },
              ]}
            />
          </AnimatedAppear>

          {plannedClients.length ? (
            <AnimatedAppear delay={120}>
              <AttentionCard
                title={t("trainer.home.activePlanWork")}
                items={[
                  {
                    id: "active-plan-work",
                    icon: "document-text-outline",
                    tone: "amber",
                    title: t("trainer.home.activePlanWorkTitle", {
                      count: plannedClients.length,
                      label: plannedClients.length === 1 ? t("trainer.home.clientHas") : t("trainer.home.clientsHave"),
                    }),
                    subtitle: t("trainer.home.activePlanWorkSubtitle"),
                    cta: { label: t("owner.home.open"), onPress: () => router.push("/trainer/plans" as never) },
                  },
                ]}
              />
            </AnimatedAppear>
          ) : null}

          <AnimatedAppear delay={160}>
            <SectionHeader title={t("trainer.home.recentFeedback")} />
            <Card variant="compact" contentStyle={styles.stack}>
            {recentFeedback.length ? (
              recentFeedback.map((feedback) => (
                <Pressable
                  key={`${feedback.clientId}-${feedback.assignmentId}`}
                  onPress={() => router.push(`/trainer/clients/${feedback.clientId}` as never)}
                  accessibilityRole="button"
                  style={({ pressed }) => (pressed ? styles.rowPressed : null)}
                >
                  <ListRow
                    title={feedback.clientName}
                    subtitle={feedback.feedback ?? `${feedback.completionPct}% complete`}
                    trailing={<StatusChip status={`${feedback.completionPct}%`} tone="blue" />}
                  />
                </Pressable>
              ))
            ) : (
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title={t("trainer.home.noRecentFeedback")}
                body={t("trainer.home.noRecentFeedbackBody")}
              />
            )}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={200}>
            <SectionHeader title={t("trainer.home.planBuilder")} />
            <Card
              variant="compact"
              pressable
              onPress={() =>
                priorityClient
                  ? router.push(`/trainer/clients/${priorityClient.memberUserId}/plan` as never)
                  : router.push("/trainer/clients" as never)
              }
            >
              <ListRow title={t("trainer.home.createPlansManually")} />
            </Card>
          </AnimatedAppear>
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
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  headerMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  iconButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  stack: { gap: spacing.sm },
});
