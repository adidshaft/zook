import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
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
        <View style={styles.container}>
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            header={
              <>
                <MobileHeader
                  eyebrow="Trainer mode"
                  title="Clients"
                  subtitle={`${session?.user.name ?? "Trainer"} · client list is access-controlled`}
                  chip={<StatusChip status="Trainer" tone="neutral" />}
                />
                <SectionHeader title="Clients" />
              </>
            }
          />
        </View>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    maxWidth: layout.contentWidth,
    width: "100%",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
