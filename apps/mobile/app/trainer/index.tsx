import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomNav,
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MetricTile,
  MobileHeader,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function Trainer() {
  const { session } = useAuth();
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const clientsWithPlans = clients.filter((client) => (client.summary?.activePlans ?? 0) > 0).length;
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title="Clients and plans"
            subtitle={`${session?.user.name ?? "Trainer"} · assigned clients only`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          <View style={styles.metricGrid}>
            <MetricTile label="Assigned clients" value={String(clients.length)} detail="Assigned to you" tone="blue" />
            <MetricTile label="Active plans" value={String(clientsWithPlans)} detail="Assigned members" tone="amber" />
            <MetricTile label="PT sessions" value="0" detail="This month" tone="lime" />
            <MetricTile label="Feedback" value="0" detail="From clients" tone="violet" />
          </View>

          {clientsWithPlans ? (
          <GlassCard variant="warning" contentStyle={styles.attentionContent}>
            <View style={styles.attentionHeader}>
              <IconBubble icon="document-text-outline" tone="amber" />
              <View style={styles.attentionCopy}>
                <Text style={styles.cardTitle}>Plans in motion</Text>
                <Text style={styles.cardBody}>{clientsWithPlans} assigned {clientsWithPlans === 1 ? "client has" : "clients have"} active plan work.</Text>
              </View>
            </View>
            <ZookButton href={`/trainer/client/${clients[0]?.memberUserId ?? ""}`} tone="secondary" icon="reader-outline">Open Client</ZookButton>
          </GlassCard>
          ) : null}

          <SectionHeader title="Assigned clients" />
          <View style={styles.stack}>
            {clientsQuery.isLoading ? (
              <GlassCard variant="compact" contentStyle={styles.attentionHeader}>
                <IconBubble icon="hourglass-outline" tone="amber" />
                <Text style={styles.cardTitle}>Loading clients...</Text>
              </GlassCard>
            ) : clients.length ? (
              clients.map((client) => (
                <Link key={client.id ?? client.memberUserId} href={`/trainer/client/${client.memberUserId}`} asChild>
                  <Pressable accessibilityRole="button">
                    <ListRow
                      title={client.user?.name ?? "Assigned client"}
                      subtitle={`${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness"} · ${client.summary?.activePlans ?? 0} active plans`}
                      leading={<IconBubble icon="person-outline" tone="lime" />}
                      trailing={<StatusChip status={client.active ? "Active" : "Assigned"} tone="lime" />}
                    />
                  </Pressable>
                </Link>
              ))
            ) : (
              <EmptyState title="No assigned clients" body="Assigned members will appear here when your gym adds them." />
            )}
          </View>

          <SectionHeader title="Recent feedback" />
          <GlassCard variant="compact" contentStyle={styles.stack}>
            <EmptyState
              title="No recent feedback"
              body="Client notes and session feedback will appear here."
            />
          </GlassCard>
        </ScrollView>
        <BottomNav selectedPath="/trainer" role="TRAINER" />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavHeight + 40,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  attentionContent: {
    gap: 14,
  },
  attentionHeader: {
    flexDirection: "row",
    gap: spacing.md,
  },
  attentionCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  stack: {
    gap: 10,
  },
});
