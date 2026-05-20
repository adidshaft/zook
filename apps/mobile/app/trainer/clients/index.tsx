import { Stack } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  EmptyState,
  MobileHeader,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { TrainerClientsSkeleton } from "@/components/skeletons";
import { ClientRow } from "@/features/trainer/components/client-row";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout } from "@/lib/theme";

export default function TrainerClientsScreen() {
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];

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
      <ZookScreen testID="trainer-clients-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lime} colors={[colors.lime]} />}
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title="Clients"
            subtitle={`${session?.user.name ?? "Trainer"} · client list is access-controlled`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SectionHeader title="Clients" />
          <View testID="trainer-client-list" style={styles.stack}>
            {clientsQuery.isLoading ? (
              <TrainerClientsSkeleton />
            ) : clientsQuery.isError ? (
              <QueryErrorState error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
            ) : clients.length ? (
              clients.map((client, index) => (
                <ClientRow key={client.id ?? client.memberUserId} client={client} index={index} />
              ))
            ) : (
              <EmptyState title="No clients yet" body="Clients will appear here when your gym adds them." />
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
