import { Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  EmptyState,
  AppHeader,
  Card,
  IconBubble,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { PlanRow } from "@/features/trainer/components/plan-row";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, useTheme } from "@/lib/theme";

export default function TrainerPlansScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const { palette } = useTheme();
  const bottomPadding = useBottomScrollPadding();
  const [refreshing, setRefreshing] = useState(false);
  const clientsQuery = useTrainerClients();
  const plannedClients = (clientsQuery.data?.clients ?? []).filter(
    (client) => (client.summary?.activePlans ?? 0) > 0,
  );

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
      <ZookScreen testID="trainer-plans-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader
            title="Plan work"
            subtitle={`${session?.user.name ?? "Trainer"} · active client plans`}
          />
          <SectionHeader
            title="Active plan work"
            subtitle={`${plannedClients.length} ${plannedClients.length === 1 ? "client" : "clients"}`}
          />
          <Card variant="compact" contentStyle={styles.summaryCard}>
            <IconBubble icon="clipboard-outline" tone={plannedClients.length ? "amber" : "neutral"} size={42} />
            <View style={styles.summaryCopy}>
              <SectionHeader
                title={plannedClients.length ? "Review active plans" : "Planning queue clear"}
                subtitle={
                  plannedClients.length
                    ? "Open each client to adjust workouts, diet notes, and feedback before publishing changes."
                    : "New plan work appears here when clients need assignments."
                }
              />
            </View>
            <StatusChip status={plannedClients.length ? "Review" : "Clear"} tone={plannedClients.length ? "amber" : "neutral"} />
          </Card>
          <View style={styles.stack}>
            {clientsQuery.isLoading ? (
              <TrainerClientsSkeleton />
            ) : clientsQuery.isError ? (
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            ) : plannedClients.length ? (
              plannedClients.map((client) => <PlanRow key={client.id ?? client.memberUserId} client={client} />)
            ) : (
              <EmptyState title="No active plan work" body="Client plans appear here after you create or assign them." />
            )}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.sm,
    maxWidth: layout.contentWidth,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  summaryCard: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  summaryCopy: { flex: 1, minWidth: 0 },
  stack: { gap: spacing.sm },
});
