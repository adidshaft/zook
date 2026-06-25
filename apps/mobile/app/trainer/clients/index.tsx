import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { MemberList, type MemberListFilter, type MemberRowItem } from "@/components/domain/member-list";
import {
  HeaderActions,
  ScreenHeader,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

export default function TrainerClientsScreen() {
  const router = useRouter();
  const t = useT();
  const queryClient = useQueryClient();
  const { activeOrgId, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<MemberListFilter>({ kind: "all" });
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const items: MemberRowItem[] = clients.map((client) => ({
    id: client.memberUserId,
    name: client.user?.name ?? t("trainer.home.clientFallback"),
    email: client.user?.email,
    avatarUrl: client.profile?.profilePhotoUrl,
    status: client.active ? "active" : "pending",
    meta: `${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? t("trainer.clients.generalFitness")} · ${t("trainer.clients.activePlanCount", {
      count: client.summary?.activePlans ?? 0,
      label: (client.summary?.activePlans ?? 0) === 1 ? t("trainer.home.plan") : t("trainer.home.plans"),
    })}`,
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
              title: clients.length ? t("trainer.clients.noMatchingClients") : t("trainer.clients.noClients"),
              subtitle: clients.length ? t("trainer.clients.tryAnotherSearch") : t("trainer.clients.noClientsBody"),
            }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            header={
              <>
                <ScreenHeader
                  title={t("trainer.clients.title")}
                  subtitle={t("trainer.clients.subtitle", {
                    name: session?.user.name ?? t("trainer.home.trainerFallback"),
                  })}
                  trailing={<HeaderActions showBell />}
                />
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
    flex: 1,
    maxWidth: layout.contentWidth,
    paddingHorizontal: spacing.md,
    width: "100%",
    paddingTop: layout.screenContentTopPadding,
  },
});
