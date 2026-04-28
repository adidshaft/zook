import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures, zookMockServices } from "@zook/core";
import {
  AuditWarning,
  BottomNav,
  DetailRow,
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Draft = Awaited<ReturnType<typeof zookMockServices.planService.generateAiPlanDraft>>;

export default function TrainerAiDraftReview() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id || "user-aarav";
  const client = zookDemoFixtures.users.find((user) => user.id === clientId) ?? zookDemoFixtures.users.find((user) => user.id === "user-aarav");
  const profile = zookDemoFixtures.memberProfiles.find((item) => item.userId === client?.id);
  const [draft, setDraft] = useState<Draft | null>(zookDemoFixtures.planDrafts[0] ?? null);
  const [status, setStatus] = useState("");

  async function generateDraft() {
    const nextDraft = await zookMockServices.planService.generateAiPlanDraft({
      trainerUserId: "user-rhea",
      clientId: client?.id ?? "user-aarav",
      goal: profile?.goal ?? "Muscle gain",
    });
    setDraft(nextDraft);
    setStatus("Draft generated. Review is still required.");
  }

  async function assignDraft() {
    if (!draft || !client) return;
    const assignedPlan = await zookMockServices.planService.assignDraft(draft.id, client.id);
    setStatus(`${assignedPlan.title} assigned. The client can now see it.`);
  }

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
            title="AI Draft Review"
            subtitle="Review, edit, then approve before assigning."
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace(`/trainer/client/${client?.id ?? "user-aarav"}`)}
                accessibilityRole="button"
                accessibilityLabel="Back to client detail"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Review required" />}
          />

          <AuditWarning>AI generated this draft. Edit and approve before assigning.</AuditWarning>

          {draft ? (
            <>
              <GlassCard contentStyle={styles.summaryContent}>
                <View style={styles.summaryHeader}>
                  <IconBubble icon="reader-outline" tone="amber" />
                  <View style={styles.summaryCopy}>
                    <Text style={styles.cardTitle}>{draft.title}</Text>
                    <Text style={styles.cardBody}>Client: {client?.name ?? "Aarav Mehta"}</Text>
                  </View>
                </View>
                <DetailRow label="Goal" value={draft.goal || "Muscle gain"} />
                <DetailRow label="Difficulty" value={draft.difficulty || "Medium"} />
              </GlassCard>

              <GlassCard variant="compact" contentStyle={styles.stack}>
                {draft.sections.map((section) => (
                  <ListRow key={section.title} title={section.title} subtitle={section.body} />
                ))}
              </GlassCard>

              <GlassCard variant="warning" contentStyle={styles.safetyContent}>
                <Text style={styles.cardTitle}>Safety panel</Text>
                <DetailRow label="Blocked" value="None detected" trailing={<StatusChip status="Clear" tone="lime" />} />
                <DetailRow label="Medical-risk check" value="Clear" trailing={<StatusChip status="Clear" tone="lime" />} />
                <DetailRow label="Trainer approval" value="Required" trailing={<StatusChip status="Required" tone="amber" />} />
                <Text style={styles.cardBody}>This draft is not visible to the client yet.</Text>
              </GlassCard>

              <View style={styles.actionRow}>
                <ZookButton onPress={() => void assignDraft()} style={styles.actionHalf} icon="checkmark-circle-outline">
                  Assign Plan
                </ZookButton>
                <SecondaryButton onPress={() => setStatus("Draft opened for editing.")} style={styles.actionHalf}>
                  Edit Draft
                </SecondaryButton>
              </View>
              <Pressable onPress={() => { setDraft(null); setStatus("Draft discarded before assignment."); }} accessibilityRole="button" style={styles.discardButton}>
                <Text style={styles.discardText}>Discard</Text>
              </Pressable>
            </>
          ) : (
            <EmptyState
              title="No draft ready"
              body="Generate a draft only after confirming the client goal and constraints."
              action={<ZookButton onPress={() => void generateDraft()} icon="sparkles-outline">Generate Draft</ZookButton>}
            />
          )}

          {status ? (
            <GlassCard variant="success" contentStyle={styles.statusContent}>
              <Text style={styles.statusText}>{status}</Text>
            </GlassCard>
          ) : null}
        </ScrollView>
        <BottomNav selectedPath="/trainer/client" />
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
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
  },
  summaryContent: {
    gap: 12,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryCopy: {
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
  safetyContent: {
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  discardButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    color: colors.muted,
    ...typography.bodyStrong,
  },
  statusContent: {
    padding: 14,
  },
  statusText: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
});
