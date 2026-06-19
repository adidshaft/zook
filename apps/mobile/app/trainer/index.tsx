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
  HeaderMeta,
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
import { useBranchSelection } from "@/lib/branch-selection";
import { useTrainerClients } from "@/lib/domains";
import { formatBranchName } from "@/lib/formatting";
import { useRoleContext } from "@/lib/role-context";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerHomeScreen() {
  const { palette } = useTheme();
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
        clientName: client.user?.name ?? "Client",
      })),
    )
    .sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
    .slice(0, 3);
  const priorityClient = plannedClients[0] ?? clients[0];
  const orgName = roleContext?.org?.name ?? session?.user.name ?? "Trainer";
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
            title="Today"
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
                    leading={<IconBubble icon="person-outline" tone="neutral" />}
                    trailing={<StatusChip status="Today" tone="neutral" />}
                  />
                </Pressable>
              ) : (
                <EmptyState title="No coaching actions today" body="Client sessions and follow-ups appear here." />
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
                tone: "blue",
              },
              {
                label: "Needs plan",
                value: clientsNeedingPlans,
                hint: "Create Plan next",
                tone: "amber",
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
                    leading={<IconBubble icon="chatbubble-ellipses-outline" tone="neutral" />}
                    trailing={<StatusChip status={`${feedback.completionPct}%`} tone="blue" />}
                  />
                </Pressable>
              ))
            ) : (
              <EmptyState title="No recent feedback" body="Client notes and session feedback appear here." />
            )}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={200}>
            <SectionHeader title="Plan builder" />
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
                title="Create plans manually"
                subtitle="Use saved templates and publish only when the plan is ready."
                leading={<IconBubble icon="reader-outline" tone="neutral" />}
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
