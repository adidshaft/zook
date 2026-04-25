import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Dock,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  Screen,
  ScreenHeader,
  SectionHeader,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";

export default function Trainer() {
  const { session } = useAuth();
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Trainer desk"
          title={session?.user.name ?? "Trainer"}
          subtitle="Assigned roster and command center."
          trailing={<Pill tone="lime">Assigned only</Pill>}
        />

        <View style={styles.metricGrid}>
          <MetricTile
            label="Assigned clients"
            value={String(clients.length)}
            detail={
              clientsQuery.isLoading
                ? "Loading roster..."
                : "Only your assigned members appear here."
            }
            tone="blue"
          />
          <MetricTile
            label="PT sessions"
            value="Offline"
            detail="Record cash payments."
            tone="amber"
          />
        </View>

        <SectionHeader
          eyebrow="Roster"
          title="Assigned clients"
          subtitle="Select a client to manage plans."
        />

        {clientsQuery.isLoading ? (
          <LoadingState
            title="Loading assigned clients"
            body="Syncing trainer assignments for the active organization."
          />
        ) : null}

        {!clientsQuery.isLoading && !clients.length ? (
          <EmptyState
            title="No assigned clients yet"
            body="Once members are assigned to you, they’ll appear here with their fitness goal and quick actions."
          />
        ) : null}

        <View style={styles.clientList}>
          {clients.map((client) => (
            <Link key={client.memberUserId} href={`/trainer/client/${client.memberUserId}`} asChild>
              <Pressable style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientCopy}>
                    <Text style={styles.clientName}>
                      {client.user?.name ?? client.user?.email ?? client.memberUserId}
                    </Text>
                    <Text style={styles.clientMeta}>
                      {client.user?.email ?? "No member email available"}
                    </Text>
                  </View>
                  <Pill tone="neutral">Manage</Pill>
                </View>
                <Text style={styles.clientGoal}>
                  {client.profile?.fitnessGoal ?? "General fitness"}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      <View style={{ height: 110 }} />
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  clientList: {
    gap: 12,
  },
  clientCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 10,
  },
  clientHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  clientCopy: {
    flex: 1,
    gap: 6,
  },
  clientName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  clientMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  clientGoal: {
    color: colors.muted,
    lineHeight: 20,
  },
});
