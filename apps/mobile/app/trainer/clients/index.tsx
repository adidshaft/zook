import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MemberList, type MemberListFilter, type MemberRowItem } from "@/components/domain/member-list";
import {
  MobileHeader,
  SectionHeader,
  StatusChip,
  ZookScreen,
} from "@/components/primitives";
import { fitnessGoalFor, planCountLabel } from "@/features/trainer/helpers";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { layout } from "@/lib/theme";

export default function TrainerClientsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<MemberListFilter>({ kind: "all" });
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
  const filteredItems = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !term ||
        [item.name, item.email, item.meta]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(term));
      const matchesFilter =
        clientFilter.kind === "all" ||
        (clientFilter.kind === "status" && item.status === clientFilter.status);
      return matchesSearch && matchesFilter;
    });
  }, [clientFilter, clientSearch, items]);

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
            items={filteredItems}
            isLoading={clientsQuery.isLoading}
            isError={clientsQuery.isError}
            onRetry={() => void clientsQuery.refetch()}
            searchValue={clientSearch}
            onSearchChange={setClientSearch}
            searchTestID="trainer-client-search"
            filter={clientFilter}
            onFilterChange={setClientFilter}
            availableFilters={[{ kind: "all" }, { kind: "status", status: "active" }, { kind: "status", status: "pending" }]}
            onPressMember={(client) => router.push(`/trainer/clients/${client.id}` as never)}
            emptyState={{
              title: clients.length ? "No matching clients" : "No clients yet",
              subtitle: clients.length ? "Try another search or filter." : "Clients will appear here when your gym adds them.",
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            header={
              <>
                <MobileHeader
                  eyebrow="Trainer"
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
