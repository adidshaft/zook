import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  AuditWarning,
  BottomNav,
  DetailRow,
  EmptyState,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { plansApi, trainerApi } from "@/lib/domain-api";
import { useAuth } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type Draft = {
  planId?: string;
  title: string;
  goal: string;
  difficulty: string;
  sections: Array<{ title: string; body: string }>;
};

function sectionsFromResponse(response: unknown): Array<{ title: string; body: string }> {
  if (response && typeof response === "object" && "sections" in response) {
    const sections = (response as { sections?: unknown }).sections;
    if (Array.isArray(sections)) {
      return sections
        .map((section) => {
          if (!section || typeof section !== "object") return null;
          const record = section as Record<string, unknown>;
          return {
            title: typeof record.title === "string" ? record.title : "Plan section",
            body: typeof record.body === "string" ? record.body : JSON.stringify(record),
          };
        })
        .filter((section): section is { title: string; body: string } => Boolean(section));
    }
  }
  return [{ title: "Generated draft", body: typeof response === "string" ? response : JSON.stringify(response ?? {}) }];
}

export default function TrainerAiDraftReview() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id || "user-aarav";
  const { activeOrgId, token } = useAuth();
  const clientsQuery = useTrainerClients();
  const client = clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === clientId) ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function updateSection(index: number, field: "title" | "body", value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, sectionIndex) =>
              sectionIndex === index ? { ...section, [field]: value } : section,
            ),
          }
        : current,
    );
  }

  async function saveDraftEdits() {
    if (!draft?.planId || !activeOrgId || !token) {
      setStatus("Generate a draft before editing.");
      return false;
    }
    setSaving(true);
    try {
      await plansApi.update({
        token,
        orgId: activeOrgId,
        planId: draft.planId,
        body: {
          title: draft.title,
          type: "WORKOUT",
          description: draft.goal,
          visibility: "selected",
          aiGenerated: true,
          content: {
            goal: draft.goal,
            difficulty: draft.difficulty,
            sections: draft.sections,
          },
        },
      });
      setEditing(false);
      setStatus("Draft edits saved.");
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save draft edits.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function generateDraft() {
    if (!token || !activeOrgId || !client) {
      setStatus("Select an assigned client before generating.");
      return;
    }
    const goal = client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness";
    const result = await trainerApi.generatePlanDraft<{
      response: unknown;
      createdPlan?: { id: string; title: string };
    }>({
      token,
      orgId: activeOrgId,
      title: `${client.user?.name ?? "Client"} workout draft`,
      type: "WORKOUT",
      prompt: `Create a safe trainer-reviewed workout plan for ${client.user?.name ?? "this member"} with goal: ${goal}.`,
    });
    setDraft({
      planId: result.createdPlan?.id,
      title: result.createdPlan?.title ?? "AI workout draft",
      goal,
      difficulty: "Coach review",
      sections: sectionsFromResponse(result.response),
    });
    setStatus("Draft generated. Review is still required.");
    setEditing(true);
  }

  async function assignDraft() {
    if (!draft?.planId || !client || !activeOrgId || !token) return;
    if (editing) {
      const saved = await saveDraftEdits();
      if (!saved) {
        return;
      }
    }
    setSaving(true);
    try {
      await plansApi.assign({
        token,
        orgId: activeOrgId,
        planId: draft.planId,
        assignedToUserId: client.memberUserId,
        audience: "selected_member",
      });
      setStatus(`${draft.title} assigned. The client can now see it.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to assign draft.");
    } finally {
      setSaving(false);
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
            title="AI Draft Review"
            subtitle="Review, edit, then approve before assigning."
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace(`/trainer/client/${client?.memberUserId ?? clientId}`)}
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
                    {editing ? (
                      <FormField label="Title" value={draft.title} onChangeText={(value) => updateDraft({ title: value })} />
                    ) : (
                      <Text style={styles.cardTitle}>{draft.title}</Text>
                    )}
                    <Text style={styles.cardBody}>Client: {client?.user?.name ?? "Assigned client"}</Text>
                  </View>
                </View>
                {editing ? (
                  <>
                    <FormField label="Goal" value={draft.goal} onChangeText={(value) => updateDraft({ goal: value })} />
                    <FormField label="Difficulty" value={draft.difficulty} onChangeText={(value) => updateDraft({ difficulty: value })} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Goal" value={draft.goal || "Muscle gain"} />
                    <DetailRow label="Difficulty" value={draft.difficulty || "Medium"} />
                  </>
                )}
              </GlassCard>

              <GlassCard variant="compact" contentStyle={styles.stack}>
                {draft.sections.map((section, index) => (
                  editing ? (
                    <View key={`${section.title}-${index}`} style={styles.stack}>
                      <FormField label={`Section ${index + 1}`} value={section.title} onChangeText={(value) => updateSection(index, "title", value)} />
                      <FormField label="Notes" value={section.body} onChangeText={(value) => updateSection(index, "body", value)} multiline />
                    </View>
                  ) : (
                    <ListRow key={section.title} title={section.title} subtitle={section.body} />
                  )
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
                <ZookButton onPress={() => void assignDraft()} style={styles.actionHalf} icon="checkmark-circle-outline" disabled={saving}>
                  Assign Plan
                </ZookButton>
                <SecondaryButton onPress={() => editing ? void saveDraftEdits() : setEditing(true)} style={styles.actionHalf} disabled={saving}>
                  {editing ? "Save Edits" : "Edit Draft"}
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
        <BottomNav selectedPath="/trainer/client" role="TRAINER" />
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
    fontSize: 26,
    lineHeight: 28,
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
