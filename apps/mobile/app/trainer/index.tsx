import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { AttentionCard } from "@/components/domain/attention";
import { MetricGrid } from "@/components/domain/metric-grid";
import {
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { fitnessGoalFor } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerHomeScreen() {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, logout, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
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
  const isDark = mode === "dark";
  const headerButtonStyle = {
    backgroundColor: isDark ? palette.surface.default : palette.surface.raised,
    borderColor: palette.border.default,
  };

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title="Trainer home"
            subtitle={`${session?.user.name ?? "Trainer"} · client list is access-controlled`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
            showProfileShortcut={false}
            trailing={
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push("/profile")}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  style={({ pressed }) => [
                    styles.iconButton,
                    headerButtonStyle,
                    pressed ? styles.controlPressed : null,
                  ]}
                >
                  <IconBubble icon="person-circle-outline" tone="blue" size={30} />
                </Pressable>
                <Pressable
                  onPress={() => void logout()}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      backgroundColor: palette.surface.dangerSoft,
                      borderColor: palette.feedback.danger,
                    },
                    pressed ? styles.controlPressed : null,
                  ]}
                >
                  <IconBubble icon="log-out-outline" tone="red" size={30} />
                </Pressable>
              </View>
            }
          />

          {clientsQuery.isLoading ? <TrainerClientsSkeleton /> : null}
          {clientsQuery.isError ? <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} /> : null}

          {priorityClient ? (
            <GlassCard testID="trainer-client-row-first" variant="compact" contentStyle={styles.priorityClientCard} pressable onPress={() => router.push(`/trainer/clients/${priorityClient.memberUserId}` as never)}>
              <ListRow
                title={priorityClient.user?.name ?? "Client"}
                subtitle={`${priorityClient.summary?.activePlans ?? 0} active plans · ${fitnessGoalFor(priorityClient)}`}
                leading={<IconBubble icon="person-outline" tone="lime" />}
                trailing={<StatusChip status="Priority client" tone="amber" />}
              />
            </GlassCard>
          ) : null}

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

          {plannedClients.length ? (
            <AttentionCard
              title="Plans in motion"
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
          ) : null}

          <SectionHeader title="Today" subtitle="The next coaching actions to clear first." />
          <GlassCard variant="compact" contentStyle={styles.stack}>
            {clientsNeedingPlans ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/trainer/clients" as never)}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow
                  title={`${clientsNeedingPlans} client${clientsNeedingPlans === 1 ? "" : "s"} need a plan`}
                  subtitle="Open Plan work and assign a starter template before the next session."
                  leading={<IconBubble icon="reader-outline" tone="amber" />}
                  trailing={<StatusChip status="Next" tone="amber" />}
                />
              </Pressable>
            ) : (
              <EmptyState title="Coaching queue clear" body="No plan or feedback follow-up is waiting right now." />
            )}
          </GlassCard>

          <SectionHeader title="Recent feedback" />
          <GlassCard variant="compact" contentStyle={styles.stack}>
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
          </GlassCard>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: 10,
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
  priorityClientCard: { gap: spacing.md },
  stack: { gap: 10 },
});
