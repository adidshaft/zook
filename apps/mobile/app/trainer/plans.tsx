import { Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  EmptyState,
  AppHeader,
  Card,
  QueryErrorState,
  SectionHeader,
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
  const { activeOrgId } = useAuth();
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
          <AppHeader title="Plan work" />
          <SectionHeader title="Active plan work" />
          <Card variant="compact">
            <SectionHeader
              title={plannedClients.length ? "Review active plans" : "Planning queue clear"}
              subtitle={
                plannedClients.length
                  ? "Open each client to adjust workouts, diet notes, and feedback before publishing changes."
                  : "No client plans need assignment."
              }
            />
          </Card>
          <View style={styles.stack}>
            {clientsQuery.isLoading ? (
              <TrainerClientsSkeleton />
            ) : clientsQuery.isError ? (
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            ) : plannedClients.length ? (
              plannedClients.map((client) => <PlanRow key={client.id ?? client.memberUserId} client={client} />)
            ) : (
              <EmptyState icon="clipboard-outline" title="No active plan work" body="Clients who need a plan or an update will appear here." />
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
  stack: { gap: spacing.sm },
});
