import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MetricTile,
  MobileHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type TrainerView = "home" | "clients" | "plans";
type TodayTask = {
  title: string;
  body: string;
  icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  tone: "lime" | "amber" | "blue";
  href?: string;
  clientId?: string;
};

function planCountLabel(count: number) {
  return `${count} active ${count === 1 ? "plan" : "plans"}`;
}

function normalizeTrainerView(value: string | string[] | undefined): TrainerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "clients" || raw === "plans") return raw;
  return "home";
}

export default function Trainer() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, logout, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const view = normalizeTrainerView(params.view);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const firstClientId = clients[0]?.memberUserId;
  const clientsWithPlans = clients.filter(
    (client) => (client.summary?.activePlans ?? 0) > 0,
  ).length;
  const plannedClients = clients.filter((client) => (client.summary?.activePlans ?? 0) > 0);
  const clientsNeedingPlans = Math.max(clients.length - clientsWithPlans, 0);
  const recentFeedback = clients
    .flatMap((client) =>
      (client.summary?.recentFeedback ?? []).map((feedback) => ({
        ...feedback,
        clientId: client.memberUserId,
        clientName: client.user?.name ?? "Client",
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
    )
    .slice(0, 3);
  const todayTasks: TodayTask[] = [];
  if (clientsNeedingPlans) {
    todayTasks.push({
      title: `${clientsNeedingPlans} client${clientsNeedingPlans === 1 ? "" : "s"} need a plan`,
      body: "Open Plan work and assign a starter template before the next session.",
      icon: "reader-outline",
      tone: "amber",
      href: "/trainer?view=plans",
    });
  }
  if (recentFeedback[0]) {
    todayTasks.push({
      title: `Review ${recentFeedback[0].clientName}`,
      body:
        recentFeedback[0].feedback ??
        `${recentFeedback[0].completionPct}% plan completion logged.`,
      icon: "chatbubble-ellipses-outline",
      tone: "blue",
      clientId: recentFeedback[0].clientId,
    });
  }
  if (plannedClients[0]) {
    todayTasks.push({
      title: `Coach ${plannedClients[0].user?.name ?? "priority client"}`,
      body: `${plannedClients[0].summary?.activePlans ?? 0} active plan${(plannedClients[0].summary?.activePlans ?? 0) === 1 ? "" : "s"} · ${plannedClients[0].summary?.fitnessGoal ?? plannedClients[0].profile?.fitnessGoal ?? "General fitness"}`,
      icon: "barbell-outline",
      tone: "lime",
      clientId: plannedClients[0].memberUserId,
    });
  }
  const firstPlannedClientId = plannedClients[0]?.memberUserId ?? firstClientId;
  const title = view === "clients" ? "Clients" : view === "plans" ? "Plan work" : "Trainer home";

  function openClient(clientId?: string) {
    if (clientId) {
      router.push(`/trainer/client/${clientId}`);
    }
  }

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
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title={title}
            subtitle={`${session?.user.name ?? "Trainer"} · client list is access-controlled`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
            trailing={
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push("/profile")}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  style={styles.iconButton}
                >
                  <IconBubble icon="person-circle-outline" tone="blue" size={30} />
                </Pressable>
                <Pressable
                  onPress={() => void logout()}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  style={[styles.iconButton, styles.signOutButton]}
                >
                  <IconBubble icon="log-out-outline" tone="red" size={30} />
                </Pressable>
              </View>
            }
          />

          {view === "home" ? (
            <>
              {firstPlannedClientId ? (
                <GlassCard
                  variant="compact"
                  contentStyle={styles.priorityClientCard}
                  pressable
                  onPress={() => openClient(firstPlannedClientId)}
                >
                  <ListRow
                    title={
                      plannedClients[0]?.user?.name ?? clients[0]?.user?.name ?? "Client"
                    }
                    subtitle={`${plannedClients[0]?.summary?.activePlans ?? clients[0]?.summary?.activePlans ?? 0} active ${(plannedClients[0]?.summary?.activePlans ?? clients[0]?.summary?.activePlans ?? 0) === 1 ? "plan" : "plans"} · ${plannedClients[0]?.summary?.fitnessGoal ?? plannedClients[0]?.profile?.fitnessGoal ?? clients[0]?.summary?.fitnessGoal ?? clients[0]?.profile?.fitnessGoal ?? "General fitness"}`}
                    leading={<IconBubble icon="person-outline" tone="lime" />}
                    trailing={<StatusChip status="Priority client" tone="amber" />}
                  />
                </GlassCard>
              ) : null}

              <View testID="trainer-view-home" style={styles.metricGrid}>
                <MetricTile
                  label="Clients"
                  value={String(clients.length)}
                  detail="Ready for coaching"
                  tone="blue"
                />
                <MetricTile
                  label="Active plans"
                  value={String(clientsWithPlans)}
                  detail="With active plans"
                  tone="amber"
                />
                <MetricTile
                  label="Needs plan"
                  value={String(clientsNeedingPlans)}
                  detail="Create Plan next"
                  tone="lime"
                />
              </View>
              {clientsWithPlans ? (
                <GlassCard variant="warning" contentStyle={styles.attentionContent}>
                  <View style={styles.attentionHeader}>
                    <IconBubble icon="document-text-outline" tone="amber" />
                    <View style={styles.attentionCopy}>
                      <Text style={styles.cardTitle}>Plans in motion</Text>
                      <Text style={styles.cardBody}>
                        {clientsWithPlans} {clientsWithPlans === 1 ? "client has" : "clients have"} active plan work.
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ) : null}

              <SectionHeader title="Today" subtitle="The next coaching actions to clear first." />
              <GlassCard variant="compact" contentStyle={styles.stack}>
                {todayTasks.length ? (
                  todayTasks.map((task) => (
                    <Pressable
                      key={task.title}
                      accessibilityRole="button"
                      onPress={() =>
                        task.clientId
                          ? openClient(task.clientId)
                          : task.href
                            ? router.push(task.href as never)
                            : undefined
                      }
                    >
                      <ListRow
                        title={task.title}
                        subtitle={task.body}
                        leading={<IconBubble icon={task.icon} tone={task.tone} />}
                        trailing={<StatusChip status="Next" tone={task.tone} />}
                      />
                    </Pressable>
                  ))
                ) : (
                  <EmptyState
                    title="Coaching queue clear"
                    body="No plan or feedback follow-up is waiting right now."
                  />
                )}
              </GlassCard>

              <SectionHeader title="Recent feedback" />
              <GlassCard variant="compact" contentStyle={styles.stack}>
                {recentFeedback.length ? (
                  recentFeedback.map((feedback) => (
                    <Pressable
                      key={`${feedback.clientId}-${feedback.assignmentId}`}
                      onPress={() => openClient(feedback.clientId)}
                      accessibilityRole="button"
                    >
                      <ListRow
                        title={feedback.clientName}
                        subtitle={feedback.feedback ?? `${feedback.completionPct}% complete`}
                        leading={<IconBubble icon="chatbubble-ellipses-outline" tone="blue" />}
                        trailing={<StatusChip status={`${feedback.completionPct}%`} tone="lime" />}
                      />
                    </Pressable>
                  ))
                ) : (
                  <EmptyState
                    title="No recent feedback"
                    body="Client notes and session feedback will appear here."
                  />
                )}
              </GlassCard>
            </>
          ) : null}

          {view === "clients" ? (
            <>
              <SectionHeader title="Clients" />
              <View testID="trainer-client-list" style={styles.stack}>
                {clientsQuery.isLoading ? (
                  <TrainerClientsSkeleton />
                ) : clientsQuery.isError ? (
                  <QueryErrorState
                    error={clientsQuery.error}
                    onRetry={() => void clientsQuery.refetch()}
                  />
                ) : clients.length ? (
                  clients.map((client, index) => {
                    const activePlanCount = client.summary?.activePlans ?? 0;
                    return (
                      <Link
                        key={client.id ?? client.memberUserId}
                        href={`/trainer/client/${client.memberUserId}`}
                        asChild
                      >
                        <Pressable
                          testID={
                            index === 0
                              ? "trainer-client-row-first"
                              : `trainer-client-row-${client.memberUserId}`
                          }
                          accessibilityRole="button"
                        >
                          <ListRow
                            title={client.user?.name ?? "Client"}
                            subtitle={`${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness"} · ${planCountLabel(activePlanCount)}`}
                            leading={<IconBubble icon="person-outline" tone="lime" />}
                            trailing={
                              <StatusChip
                                status={client.active ? "Active" : "Paused"}
                                tone="lime"
                              />
                            }
                          />
                        </Pressable>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState
                    title="No clients yet"
                    body="Clients will appear here when your gym adds them."
                  />
                )}
              </View>
            </>
          ) : null}

          {view === "plans" ? (
            <>
              <SectionHeader
                title="Active plan work"
                subtitle={`${clientsWithPlans} ${clientsWithPlans === 1 ? "client" : "clients"}`}
              />
              <View style={styles.stack}>
                {clientsQuery.isLoading ? (
                  <TrainerClientsSkeleton />
                ) : clientsQuery.isError ? (
                  <QueryErrorState
                    error={clientsQuery.error}
                    onRetry={() => void clientsQuery.refetch()}
                  />
                ) : plannedClients.length ? (
                  plannedClients.map((client) => (
                    <GlassCard
                      key={client.id ?? client.memberUserId}
                      variant="compact"
                      contentStyle={styles.planCard}
                    >
                      <ListRow
                        title={client.user?.name ?? "Client"}
                        subtitle={`${client.summary?.activePlans ?? 0} active ${(client.summary?.activePlans ?? 0) === 1 ? "plan" : "plans"} · ${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness"}`}
                        leading={<IconBubble icon="reader-outline" tone="amber" />}
                        trailing={<StatusChip status="Open" tone="amber" />}
                      />
                      <ZookButton
                        testID={`trainer-client-detail-${client.memberUserId}`}
                        onPress={() => openClient(client.memberUserId)}
                        tone="secondary"
                        icon="reader-outline"
                      >
                        Client Detail
                      </ZookButton>
                    </GlassCard>
                  ))
                ) : (
                  <EmptyState
                    title="No active plan work"
                    body="Client plans will appear here after you create or assign them."
                  />
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
        <BottomNav
          selectedPath="/trainer"
          role="TRAINER"
          activeView={view === "home" ? undefined : view}
        />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 8,
    gap: 10,
    paddingBottom: layout.bottomNavContentPadding + 32,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutButton: {
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
  },
  priorityClientCard: {
    gap: spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attentionContent: {
    gap: 14,
  },
  attentionHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  attentionCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  stack: {
    gap: 10,
  },
  planCard: {
    gap: spacing.md,
  },
});
