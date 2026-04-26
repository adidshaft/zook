import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures } from "@zook/core";
import {
  ActiveGymPill,
  Card,
  Dock,
  IconBubble,
  ListRow,
  MetricTile,
  Pill,
  PrimaryLink,
  Screen,
  SectionHeader,
} from "@/components/primitives";
import { colors } from "@/lib/theme";

const clients = zookDemoFixtures.trainerClientAssignments
  .filter((assignment) => assignment.trainerUserId === "user-rhea" && assignment.active)
  .map((assignment) => {
    const user = zookDemoFixtures.users.find((candidate) => candidate.id === assignment.memberUserId);
    const profile = zookDemoFixtures.memberProfiles.find((candidate) => candidate.userId === assignment.memberUserId);
    const membership = zookDemoFixtures.memberships.find((candidate) => candidate.memberUserId === assignment.memberUserId);
    return { assignment, user, profile, membership };
  });

export default function Trainer() {
  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <ActiveGymPill label="Iron Temple Gym · Pune" />
            <Text style={styles.title}>Coach cockpit</Text>
            <Text style={styles.subtitle}>Coach Rhea · assigned clients only</Text>
          </View>
          <Pill tone="lime">Trainer</Pill>
        </View>

        <View style={styles.metricGrid}>
          <MetricTile label="Assigned clients" value={String(clients.length)} detail="Only scoped members" tone="blue" style={styles.metricHalf} />
          <MetricTile label="Drafts" value="1" detail="Needs review" tone="amber" style={styles.metricHalf} />
          <MetricTile label="PT sessions" value="6" detail="Aarav pack left" tone="lime" style={styles.metricHalf} />
          <MetricTile label="Feedback" value="2" detail="Unread notes" tone="violet" style={styles.metricHalf} />
        </View>

        <Card style={styles.attentionCard}>
          <View style={styles.attentionHeader}>
            <IconBubble icon="sparkles-outline" tone="amber" />
            <View style={styles.attentionCopy}>
              <Text style={styles.cardTitle}>AI draft needs review</Text>
              <Text style={styles.cardBody}>4-week Push/Pull Routine for Aarav Mehta is hidden from the client until assigned.</Text>
            </View>
          </View>
          <PrimaryLink href="/trainer/client/user-aarav" tone="secondary">Review Draft</PrimaryLink>
        </Card>

        <SectionHeader title="Today's assigned clients" subtitle="Trainer-visible tracking is opt-in and never assumed." />
        <View style={styles.stack}>
          {clients.map((client) => (
            <Link key={client.assignment.id} href={`/trainer/client/${client.assignment.memberUserId}`} asChild>
              <Pressable accessibilityRole="button">
                <ListRow
                  title={client.user?.name ?? "Assigned client"}
                  subtitle={`${client.profile?.goal ?? "General fitness"} · Last check-in ${client.membership?.lastCheckInLabel ?? "Not available"}`}
                  leading={<IconBubble icon="person-outline" tone="lime" />}
                  trailing={<Pill tone="lime">{client.membership?.status ?? "ACTIVE"}</Pill>}
                />
              </Pressable>
            </Link>
          ))}
        </View>

        <SectionHeader title="Recent feedback" />
        <Card style={styles.stack}>
          <ListRow title="Aarav Mehta" subtitle="Bench felt strong. Shoulder warm-up helped." trailing={<Pill tone="blue">Plan</Pill>} />
          <ListRow title="System notice" subtitle="Minor-safe AI rules active for protected accounts." trailing={<Pill tone="amber">Safety</Pill>} />
        </Card>

        <PrimaryLink href="/trainer/client/user-aarav">Create Plan</PrimaryLink>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  attentionCard: {
    gap: 14,
    borderColor: "rgba(245,200,75,0.24)",
    backgroundColor: "rgba(245,200,75,0.08)",
  },
  attentionHeader: {
    flexDirection: "row",
    gap: 12,
  },
  attentionCopy: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  stack: {
    gap: 12,
  },
});
