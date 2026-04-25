import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Dock,
  EmptyState,
  LoadingState,
  MetricTile,
  Pill,
  PrimaryLink,
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
          title="Coach cockpit"
          subtitle={session?.user.name ?? "Trainer workspace"}
          trailing={<Pill tone="lime">Assigned only</Pill>}
        />

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={30} color={colors.bg} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{session?.user.name ?? "Trainer profile"}</Text>
            <Text style={styles.profileBody}>Strength coaching · habit building · beginner form checks</Text>
            <View style={styles.profileTags}>
              <Pill tone="lime">Profile visible</Pill>
              <Pill tone="blue">Expertise ready</Pill>
            </View>
          </View>
        </View>

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

        <PrimaryLink href="/assistant">Open AI coach chat</PrimaryLink>

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
              <Pressable style={({ pressed }) => [styles.clientCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
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

      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  profileCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.2)",
    backgroundColor: "rgba(185,244,85,0.08)",
    padding: 18,
    flexDirection: "row",
    gap: 14,
  },
  profileAvatar: {
    width: 62,
    height: 62,
    borderRadius: 22,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCopy: {
    flex: 1,
    gap: 8,
  },
  profileName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  profileBody: {
    color: colors.muted,
    lineHeight: 20,
  },
  profileTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
