import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AttentionCard } from "@/components/domain/attention";
import { MetricGrid } from "@/components/domain/metric-grid";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import {
  AnimatedAppear,
  EmptyState,
  Card,
  IconBubble,
  ListRow,
  OperationalQueueCard,
  ProfileShortcut,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { fitnessGoalFor } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, useTheme } from "@/lib/theme";

export default function TrainerHomeScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
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
        clientName: client.user?.name ?? "Client",
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
          contentContainerStyle={styles.content}
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader
            title="Trainer"
            subtitle={session?.user.name ?? undefined}
            contextSlot={<RoleSwitcherContextPill />}
            scrollY={scrollY}
            trailing={<ProfileShortcut />}
          />

          {clientsQuery.isLoading ? <TrainerClientsSkeleton /> : null}
          {clientsQuery.isError ? <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} /> : null}

          <AnimatedAppear delay={0}>
            <SectionHeader title="Today" subtitle="The next coaching actions to clear first." />
            <Card variant="compact" contentStyle={styles.stack}>
              {priorityClient ? (
                <Pressable
                  testID="trainer-client-row-first"
                  accessibilityRole="button"
                  onPress={() => router.push(`/trainer/clients/${priorityClient.memberUserId}` as never)}
                  style={({ pressed }) => (pressed ? styles.rowPressed : null)}
                >
                  <ListRow
                    title={priorityClient.user?.name ?? "Client"}
                    subtitle={`${priorityClient.summary?.activePlans ?? 0} active ${(priorityClient.summary?.activePlans ?? 0) === 1 ? "plan" : "plans"} · ${fitnessGoalFor(priorityClient)}`}
                    leading={<IconBubble icon="person-outline" tone="lime" />}
                    trailing={<StatusChip status="Today" tone="amber" />}
                  />
                </Pressable>
              ) : (
                <EmptyState title="No coaching actions today" body="Client sessions and follow-ups will appear here." />
              )}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={40}>
            <SectionHeader
              title="Needs plan"
              subtitle={`${clientsNeedingPlans} client${clientsNeedingPlans === 1 ? "" : "s"} ready for coaching.`}
            />
            {clientsNeedingPlans ? (
              <OperationalQueueCard
                title={`${clientsNeedingPlans} client${clientsNeedingPlans === 1 ? "" : "s"} need a plan`}
                subtitle="Create the next workout or diet assignment before their next visit."
                meta="Trainer planning queue"
                status="Create plan next"
                tone="amber"
                icon="reader-outline"
                actionLabel="Open clients"
                onPress={() => router.push("/trainer/clients" as never)}
              />
            ) : (
              <Card variant="compact" contentStyle={styles.stack}>
                <EmptyState title="Plan queue clear" body="Every assigned client has active plan work." />
              </Card>
            )}
          </AnimatedAppear>

          <AnimatedAppear delay={80}>
            <MetricGrid
              testID="trainer-view-home"
              items={[
              {
                label: "Clients",
                value: clients.length,
                hint: "Ready for coaching",
                tone: "blue",
              },
              {
                label: "Active plans",
                value: plannedClients.length,
                hint: "With active plans",
                tone: "amber",
              },
              {
                label: "Needs plan",
                value: clientsNeedingPlans,
                hint: "Create Plan next",
                tone: "lime",
              },
              ]}
            />
          </AnimatedAppear>

          {plannedClients.length ? (
            <AnimatedAppear delay={120}>
              <AttentionCard
                title="Active plan work"
                items={[
                  {
                    id: "active-plan-work",
                    icon: "document-text-outline",
                    tone: "amber",
                    title: `${plannedClients.length} ${plannedClients.length === 1 ? "client has" : "clients have"} active plan work`,
                    subtitle: "Open Plan work to review what is in motion.",
                    cta: { label: "Open", onPress: () => router.push("/trainer/plans" as never) },
                  },
                ]}
              />
            </AnimatedAppear>
          ) : null}

          <AnimatedAppear delay={160}>
            <SectionHeader title="Recent feedback" />
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
                    leading={<IconBubble icon="chatbubble-ellipses-outline" tone="blue" />}
                    trailing={<StatusChip status={`${feedback.completionPct}%`} tone="lime" />}
                  />
                </Pressable>
              ))
            ) : (
              <EmptyState title="No recent feedback" body="Client notes and session feedback will appear here." />
            )}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={200}>
            <SectionHeader title="AI draft" />
            <Card
              variant="compact"
              pressable
              onPress={() =>
                priorityClient
                  ? router.push(`/trainer/clients/${priorityClient.memberUserId}/plan` as never)
                  : router.push("/trainer/clients" as never)
              }
            >
              <ListRow
                title="AI drafting is off"
                subtitle="Create and edit plans manually."
                leading={<IconBubble icon="sparkles-outline" tone="blue" />}
                trailing={<StatusChip status="Manual" tone="neutral" />}
              />
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
    gap: 16,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding + 32,
    paddingTop: 8,
    width: "100%",
  },
  headerActions: { alignItems: "center", flexDirection: "row", gap: 8 },
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
  stack: { gap: 10 },
});
