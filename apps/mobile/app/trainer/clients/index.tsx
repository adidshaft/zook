import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { MemberList, type MemberRowItem } from "@/components/domain/member-list";
import {
  MobileHeader,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { fitnessGoalFor, planCountLabel } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { legacyColors, layout } from "@/lib/theme";

export default function TrainerClientsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const items: MemberRowItem[] = clients.map((client) => ({
    id: client.memberUserId,
    name: client.user?.name ?? "Client",
    email: client.user?.email,
    avatarUrl: client.profile?.profilePhotoUrl,
    status: client.active ? "active" : "pending",
    meta: `${fitnessGoalFor(client)} · ${planCountLabel(client.summary?.activePlans ?? 0)}`,
  }));

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={legacyColors.lime} colors={[legacyColors.lime]} />}
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title="Clients"
            subtitle={`${session?.user.name ?? "Trainer"} · client list is access-controlled`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SectionHeader title="Clients" />
          <MemberList
            testID="trainer-client"
            items={items}
            isLoading={clientsQuery.isLoading}
            isError={clientsQuery.isError}
            onRetry={() => void clientsQuery.refetch()}
            onPressMember={(client) => router.push(`/trainer/clients/${client.id}` as never)}
            emptyState={{
              title: "No clients yet",
              subtitle: "Clients will appear here when your gym adds them.",
            }}
          />
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
});
