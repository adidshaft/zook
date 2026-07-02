import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { AttentionCard } from "@/components/domain/attention";
import {
  AnimatedAppear,
  EmptyState,
  Card,
  HeaderActions,
  BranchSelectorChip,
  ListRow,
  OperationalQueueCard,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { fitnessGoalFor } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

export default function TrainerHomeScreen() {
  const { palette } = useTheme();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomScrollPadding();
  const { activeOrgId } = useAuth();
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
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
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
                      goal: fitnessGoalFor(priorityClient, t("trainer.clients.generalFitness")),
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shortcutRail}
            >
              {[
                {
                  label: t("trainer.home.personalTraining"),
                  icon: "barbell-outline" as const,
                  href: "/trainer/pt" as const,
                  accessibilityLabel: t("trainer.home.openPersonalTraining"),
                },
                {
                  label: t("trainer.home.classes"),
                  icon: "calendar-outline" as const,
                  href: "/trainer/classes" as const,
                  accessibilityLabel: t("trainer.home.openClasses"),
                },
                {
                  label: t("trainer.home.referGym"),
                  icon: "gift-outline" as const,
                  href: "/rewards" as const,
                  accessibilityLabel: t("trainer.home.referGymAccessibility"),
                },
              ].map((item) => (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  accessibilityLabel={item.accessibilityLabel}
                  onPress={() => router.push(item.href as never)}
                  style={({ pressed }) => (pressed ? styles.rowPressed : null)}
                >
                  <Card variant="compact" padding={12} contentStyle={styles.shortcutTile}>
                    <Ionicons name={item.icon} size={20} color={palette.text.secondary} />
                    <Text
                      numberOfLines={1}
                      style={[styles.shortcutLabel, { color: palette.text.primary }]}
                    >
                      {item.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </AnimatedAppear>

          {clientsNeedingPlans ? (
            <AnimatedAppear delay={40}>
              <SectionHeader title={t("trainer.home.needsPlan")} />
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
            </AnimatedAppear>
          ) : null}

          {plannedClients.length ? (
            <AnimatedAppear delay={clientsNeedingPlans ? 80 : 40}>
              <AttentionCard
                title={t("trainer.home.activePlanWork")}
                items={[
                  {
                    id: "active-plan-work",
                    icon: "document-text-outline",
                    tone: "amber",
                    title: t("trainer.plans.reviewActivePlans"),
                    subtitle: t("trainer.home.activePlanWorkSubtitle"),
                    cta: { label: t("owner.home.open"), onPress: () => router.push("/trainer/plans" as never) },
                  },
                ]}
              />
            </AnimatedAppear>
          ) : null}

          <AnimatedAppear delay={plannedClients.length || clientsNeedingPlans ? 120 : 80}>
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
                    subtitle={feedback.feedback ?? t("trainer.clientSessions.completePercent", { percent: feedback.completionPct })}
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
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
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
  shortcutRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  shortcutTile: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 48,
    width: 214,
  },
  shortcutLabel: {
    flex: 1,
    ...typography.button,
    lineHeight: 18,
  },
  stack: { gap: spacing.sm },
});
