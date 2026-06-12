import { Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  EmptyState,
  AppHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { PlanRow } from "@/features/trainer/components/plan-row";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { layout, useTheme } from "@/lib/theme";

export default function TrainerPlansScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const { palette } = useTheme();
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
          contentContainerStyle={styles.content}
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
            eyebrow="Trainer"
            title="Plan work"
            subtitle={`${session?.user.name ?? "Trainer"} · active client plans`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SectionHeader
            title="Active plan work"
            subtitle={`${plannedClients.length} ${plannedClients.length === 1 ? "client" : "clients"}`}
          />
          <View style={styles.stack}>
            {clientsQuery.isLoading ? (
              <TrainerClientsSkeleton />
            ) : clientsQuery.isError ? (
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            ) : plannedClients.length ? (
              plannedClients.map((client) => <PlanRow key={client.id ?? client.memberUserId} client={client} />)
            ) : (
              <EmptyState title="No active plan work" body="Client plans will appear here after you create or assign them." />
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
    gap: 10,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding + 32,
    paddingTop: 8,
    width: "100%",
  },
  stack: { gap: 10 },
});
