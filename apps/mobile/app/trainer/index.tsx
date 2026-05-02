import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
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

type TrainerView = "home" | "clients" | "plans";

function normalizeTrainerView(value: string | string[] | undefined): TrainerView {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "clients" || raw === "plans") return raw;
  return "home";
}

export default function Trainer() {
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const router = useRouter();
  const { session } = useAuth();
  const view = normalizeTrainerView(params.view);
  const clientsQuery = useTrainerClients();
  const clients = clientsQuery.data?.clients ?? [];
  const firstClientId = clients[0]?.memberUserId;
  const clientsWithPlans = clients.filter(
    (client) => (client.summary?.activePlans ?? 0) > 0,
  ).length;
  const plannedClients = clients.filter((client) => (client.summary?.activePlans ?? 0) > 0);
  const firstPlannedClientId = plannedClients[0]?.memberUserId ?? firstClientId;
  const clientsNeedingPlans = Math.max(clients.length - clientsWithPlans, 0);
  const title = view === "clients" ? "Clients" : view === "plans" ? "Plan work" : "Trainer home";

  function openClient(clientId?: string) {
    if (clientId) {
      router.push(`/trainer/client/${clientId}`);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Trainer mode"
            title={title}
            subtitle={`${session?.user.name ?? "Trainer"} · assigned clients only`}
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          {view === "home" ? (
            <>
              <View style={styles.metricGrid}>
                <MetricTile
                  label="Assigned clients"
                  value={String(clients.length)}
                  detail="Assigned to you"
                  tone="blue"
                />
                <MetricTile
                  label="Active plans"
                  value={String(clientsWithPlans)}
                  detail="Assigned members"
                  tone="amber"
                />
                <MetricTile
                  label="Needs plan"
                  value={String(clientsNeedingPlans)}
                  detail="Assigned clients"
                  tone="lime"
                />
              </View>

              {clientsWithPlans ? (
                <GlassCard variant="warning" contentStyle={styles.attentionContent}>
                  <View style={styles.attentionHeader}>
                    <IconBubble icon="document-text-outline" tone="amber" />
                    <View style={styles.attentionCopy}>
                      <Text style={styles.cardTitle}>Plans in motion</Text>
                      <Text style={styles.cardBody}>
                        {clientsWithPlans} assigned{" "}
                        {clientsWithPlans === 1 ? "client has" : "clients have"} active plan work.
                      </Text>
                    </View>
                  </View>
                  <ZookButton
                    href={
                      firstPlannedClientId ? `/trainer/client/${firstPlannedClientId}` : undefined
                    }
                    disabled={!firstPlannedClientId}
                    tone="secondary"
                    icon="reader-outline"
                  >
                    Open Client
                  </ZookButton>
                </GlassCard>
              ) : null}

              <SectionHeader title="Recent feedback" />
              <GlassCard variant="compact" contentStyle={styles.stack}>
                <EmptyState
                  title="No recent feedback"
                  body="Client notes and session feedback will appear here."
                />
              </GlassCard>
            </>
          ) : null}

          {view === "clients" ? (
            <>
              <SectionHeader title="Assigned clients" />
              <View style={styles.stack}>
                {clientsQuery.isLoading ? (
                  <GlassCard variant="compact" contentStyle={styles.attentionHeader}>
                    <IconBubble icon="hourglass-outline" tone="amber" />
                    <Text style={styles.cardTitle}>Loading clients...</Text>
                  </GlassCard>
                ) : clients.length ? (
                  clients.map((client) => (
                    <Link
                      key={client.id ?? client.memberUserId}
                      href={`/trainer/client/${client.memberUserId}`}
                      asChild
                    >
                      <Pressable accessibilityRole="button">
                        <ListRow
                          title={client.user?.name ?? "Assigned client"}
                          subtitle={`${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness"} · ${client.summary?.activePlans ?? 0} active plans`}
                          leading={<IconBubble icon="person-outline" tone="lime" />}
                          trailing={
                            <StatusChip
                              status={client.active ? "Active" : "Assigned"}
                              tone="lime"
                            />
                          }
                        />
                      </Pressable>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    title="No assigned clients"
                    body="Assigned members will appear here when your gym adds them."
                  />
                )}
              </View>
            </>
          ) : null}

          {view === "plans" ? (
            <>
              <SectionHeader
                title="Active plan work"
                subtitle={`${clientsWithPlans} ${clientsWithPlans === 1 ? "client" : "clients"}`}
              />
              <View style={styles.stack}>
                {clientsQuery.isLoading ? (
                  <GlassCard variant="compact" contentStyle={styles.attentionHeader}>
                    <IconBubble icon="hourglass-outline" tone="amber" />
                    <Text style={styles.cardTitle}>Loading plan work...</Text>
                  </GlassCard>
                ) : plannedClients.length ? (
                  plannedClients.map((client) => (
                    <GlassCard
                      key={client.id ?? client.memberUserId}
                      variant="compact"
                      contentStyle={styles.planCard}
                    >
                      <ListRow
                        title={client.user?.name ?? "Assigned client"}
                        subtitle={`${client.summary?.activePlans ?? 0} active ${(client.summary?.activePlans ?? 0) === 1 ? "plan" : "plans"} · ${client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness"}`}
                        leading={<IconBubble icon="reader-outline" tone="amber" />}
                        trailing={<StatusChip status="Open" tone="amber" />}
                      />
                      <ZookButton
                        onPress={() => openClient(client.memberUserId)}
                        tone="secondary"
                        icon="reader-outline"
                      >
                        Review Client
                      </ZookButton>
                    </GlassCard>
                  ))
                ) : (
                  <EmptyState
                    title="No active plan work"
                    body="Assigned client plans will appear here after you create or assign them."
                  />
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
        <BottomNav
          selectedPath="/trainer"
          role="TRAINER"
          activeView={view === "home" ? undefined : view}
        />
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
    paddingBottom: layout.bottomNavContentPadding,
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
  planCard: {
    gap: spacing.md,
  },
});
