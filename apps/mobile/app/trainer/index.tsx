import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures } from "@zook/core";
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
import { colors, layout, spacing, typography } from "@/lib/theme";

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
            title="Coach cockpit"
            subtitle="Coach Rhea · assigned clients only"
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          <View style={styles.metricGrid}>
            <MetricTile label="Assigned clients" value={String(clients.length)} detail="Scoped to you" tone="blue" />
            <MetricTile label="Drafts" value="1" detail="Review required" tone="amber" />
            <MetricTile label="PT sessions" value="6" detail="Aarav pack left" tone="lime" />
            <MetricTile label="Feedback" value="2" detail="Unread notes" tone="violet" />
          </View>

          <GlassCard variant="warning" contentStyle={styles.attentionContent}>
            <View style={styles.attentionHeader}>
              <IconBubble icon="document-text-outline" tone="amber" />
              <View style={styles.attentionCopy}>
                <Text style={styles.cardTitle}>Review required</Text>
                <Text style={styles.cardBody}>4-week Push/Pull Routine for Aarav Mehta is hidden until you approve it.</Text>
              </View>
            </View>
            <ZookButton href="/trainer/client/user-aarav/ai-draft" tone="secondary" icon="reader-outline">Review Draft</ZookButton>
          </GlassCard>

          <SectionHeader title="Assigned clients" subtitle="Trainer-visible tracking is opt-in and scoped." />
          <View style={styles.stack}>
            {clients.length ? (
              clients.map((client) => (
                <Link key={client.assignment.id} href={`/trainer/client/${client.assignment.memberUserId}`} asChild>
                  <Pressable accessibilityRole="button">
                    <ListRow
                      title={client.user?.name ?? "Assigned client"}
                      subtitle={`${client.profile?.goal ?? "General fitness"} · Last check-in ${client.membership?.lastCheckInLabel ?? "Not available"}`}
                      leading={<IconBubble icon="person-outline" tone="lime" />}
                      trailing={<StatusChip status={client.membership?.status ?? "ACTIVE"} tone="lime" />}
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
            <ListRow title="Aarav Mehta" subtitle="Bench felt strong. Shoulder warm-up helped." trailing={<StatusChip status="Plan" tone="neutral" />} />
            <ListRow title="System notice" subtitle="Minor-safe AI rules active for protected accounts." trailing={<StatusChip status="Safety" tone="amber" />} />
          </GlassCard>
        </ScrollView>
        <BottomNav selectedPath="/trainer" />
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
    paddingBottom: 128,
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
