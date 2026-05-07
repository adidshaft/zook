import { Stack, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { plansApi, trainerApi } from "@/lib/domain-api";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { useTrainerClients } from "@/lib/query-hooks";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type Draft = {
  planId?: string;
  title: string;
  goal: string;
  difficulty: string;
  sections: Array<{ title: string; body: string }>;
};

type AuditLogEntry = {
  id: string;
  label: string;
  at: string;
};

function sectionsFromResponse(response: unknown): Array<{ title: string; body: string }> {
  if (response && typeof response === "object" && "days" in response) {
    const days = (response as { days?: unknown }).days;
    if (Array.isArray(days)) {
      return days
        .map((day) => {
          if (!day || typeof day !== "object") return null;
          const record = day as Record<string, unknown>;
          const exercises = Array.isArray(record.exercises) ? record.exercises : [];
          return {
            title: typeof record.name === "string" ? record.name : "Training day",
            body: exercises
              .map((exercise) => {
                if (!exercise || typeof exercise !== "object") return "";
                const item = exercise as Record<string, unknown>;
                return [
                  typeof item.name === "string" ? item.name : "Exercise",
                  typeof item.sets === "string" ? item.sets : null,
                  typeof item.reps === "string" ? item.reps : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
              })
              .filter(Boolean)
              .join("\n"),
          };
        })
        .filter((section): section is { title: string; body: string } => Boolean(section));
    }
  }
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
  return [
    {
      title: "Generated draft",
      body: typeof response === "string" ? response : JSON.stringify(response ?? {}),
    },
  ];
}

function exercisesFromSections(sections: Array<{ title: string; body: string }>) {
  return sections
    .flatMap((section) =>
      section.body
        .split(/\n+|[.;]/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => ({
          id: `${section.title}-${index}`,
          name: line.slice(0, 120),
          raw: line,
          day: section.title,
        })),
    )
    .slice(0, 16);
}

export default function TrainerAiDraftReview() {
  useHideBottomNav();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = id;
  const { activeOrgId, token } = useAuth();
  const canGeneratePlan = useHasPermission("AI_GENERATE_PLAN");
  const clientsQuery = useTrainerClients();
  const client =
    clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === clientId) ?? null;
  const clientGoal = client?.summary?.fitnessGoal ?? client?.profile?.fitnessGoal ?? "Not set";
  const clientWeight =
    typeof client?.summary?.weightKg === "number" ? `${client.summary.weightKg} kg` : "Not set";
  const clientDiet = client?.summary?.dietPreference ?? "Not set";
  const recentWorkoutCount = client?.summary?.recentWorkouts?.length ?? 0;
  const draftStorageKey = `zook_trainer_ai_draft_${activeOrgId ?? "org"}_${clientId}`;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const showOwnerApprovalRequired = () => {
    showToast({ title: "Owner approval required", tone: "amber" });
  };

  function appendAudit(label: string) {
    setAuditLog((current) => [
      {
        id: `${Date.now()}-${current.length}`,
        label,
        at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...current,
    ]);
  }

  useEffect(() => {
    let cancelled = false;
    setDraftHydrated(false);
    void getStoredValue(draftStorageKey)
      .then((storedDraft) => {
        if (cancelled || !storedDraft) return;
        const parsed = JSON.parse(storedDraft) as Draft;
        if (parsed?.title && Array.isArray(parsed.sections)) {
          setDraft(parsed);
          setStatus("Recovered your saved draft from this device.");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDraftHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (draft) {
      void setStoredValue(draftStorageKey, JSON.stringify(draft));
      return;
    }
    void deleteStoredValue(draftStorageKey);
  }, [draft, draftHydrated, draftStorageKey]);

  useEffect(() => {
    if (!clientId) {
      router.replace("/trainer?view=clients");
    }
  }, [clientId, router]);

  if (!clientId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            title="Plan Assistant"
            subtitle="AI plan generation is coming soon."
            leading={
              <Pressable
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(`/trainer/client/${client?.memberUserId ?? clientId}`)
                }
                accessibilityRole="button"
                accessibilityLabel="Back to client detail"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Coming soon" tone="neutral" />}
          />

          <GlassCard variant="compact" contentStyle={styles.emptyContent}>
            <IconBubble icon="sparkles-outline" tone="neutral" size={46} />
            <View style={styles.summaryCopy}>
              <Text style={styles.cardTitle}>AI plan assistant coming soon</Text>
              <Text style={styles.cardBody}>
                Create the client plan manually for launch. You can save a draft, review it, and
                assign it from the client plan builder.
              </Text>
            </View>
            <ZookButton
              onPress={() =>
                router.replace(`/trainer/client/${client?.memberUserId ?? clientId}?tab=plans` as Href)
              }
              icon="reader-outline"
            >
              Open manual plan builder
            </ZookButton>
          </GlassCard>
        </KeyboardAwareScreen>
        <BottomNav selectedPath="/trainer/client" role="TRAINER" />
      </ZookScreen>
    </>
  );

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
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
            exercises: exercisesFromSections(draft.sections),
          },
        },
      });
      setEditing(false);
      setStatus("Draft edits saved.");
      appendAudit("Trainer edits saved to the draft plan.");
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
      setStatus("Select a client before generating.");
      return;
    }
    setGenerating(true);
    setStatus("");
    const goal = client.summary?.fitnessGoal ?? client.profile?.fitnessGoal ?? "General fitness";
    try {
      const result = await trainerApi.generatePlanDraft<{
        response: unknown;
        createdPlan?: { id: string; title: string };
      }>({
        token,
        orgId: activeOrgId,
        targetUserId: client.memberUserId,
        title: `${client.user?.name ?? "Client"} workout draft`,
        type: "WORKOUT",
        prompt: `Create a safe trainer-reviewed workout plan for ${client.user?.name ?? "this member"} with goal: ${goal}.`,
      });
      setDraft({
        planId: result.createdPlan?.id,
        title: result.createdPlan?.title ?? "Workout draft",
        goal,
        difficulty: "Coach review",
        sections: sectionsFromResponse(result.response),
      });
      setStatus("Draft generated. Review is still required.");
      setEditing(true);
      appendAudit("AI suggestion generated from the current client profile.");
    } catch (error) {
      setStatus(getApiErrorMessage(error));
    } finally {
      setGenerating(false);
    }
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
      await plansApi.review({ token, orgId: activeOrgId, planId: draft.planId });
      await plansApi.assign({
        token,
        orgId: activeOrgId,
        planId: draft.planId,
        assignedToUserId: client.memberUserId,
        audience: "selected_member",
      });
      void deleteStoredValue(draftStorageKey);
      setStatus(`${draft.title} assigned. The client can now see it.`);
      appendAudit("Draft reviewed and assigned to the client.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to assign draft.");
    } finally {
      setSaving(false);
    }
  }

  const visibleDraft = draft ?? {
    title: "",
    goal: "",
    difficulty: "",
    sections: [],
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
          }}
        >
          <MobileHeader
            title="Draft Review"
            subtitle="Review, edit, then approve before assigning."
            leading={
              <Pressable
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(`/trainer/client/${client?.memberUserId ?? clientId}`)
                }
                accessibilityRole="button"
                accessibilityLabel="Back to client detail"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Review required" />}
          />

          <AuditWarning>Review and edit this draft before assigning it.</AuditWarning>

          {visibleDraft ? (
            <>
              <GlassCard contentStyle={styles.summaryContent}>
                <View style={styles.summaryHeader}>
                  <IconBubble icon="reader-outline" tone="amber" />
                  <View style={styles.summaryCopy}>
                    {editing ? (
                      <FormField
                        label="Title"
                        value={visibleDraft.title}
                        onChangeText={(value) => updateDraft({ title: value })}
                      />
                    ) : (
                      <Text style={styles.cardTitle}>{visibleDraft.title}</Text>
                    )}
                    <Text style={styles.cardBody}>Client: {client?.user?.name ?? "Client"}</Text>
                  </View>
                </View>
                <View style={styles.clientContextGrid}>
                  <DetailRow label="Current goal" value={clientGoal} />
                  <DetailRow label="Weight" value={clientWeight} />
                  <DetailRow label="Diet" value={clientDiet} />
                  <DetailRow label="Recent workouts" value={String(recentWorkoutCount)} />
                </View>
                {editing ? (
                  <>
                    <FormField
                      label="Goal"
                      value={visibleDraft.goal}
                      onChangeText={(value) => updateDraft({ goal: value })}
                    />
                    <FormField
                      label="Difficulty"
                      value={visibleDraft.difficulty}
                      onChangeText={(value) => updateDraft({ difficulty: value })}
                    />
                  </>
                ) : (
                  <>
                    <DetailRow label="Goal" value={visibleDraft.goal || "Muscle gain"} />
                    <DetailRow label="Difficulty" value={visibleDraft.difficulty || "Medium"} />
                  </>
                )}
              </GlassCard>

              <GlassCard variant="compact" contentStyle={styles.stack}>
                <View style={styles.reviewColumns}>
                  <View style={styles.reviewColumn}>
                    <Text style={styles.reviewColumnLabel}>AI suggestion</Text>
                    <Text style={styles.reviewColumnBody}>
                      {visibleDraft.sections.length} draft{" "}
                      {visibleDraft.sections.length === 1 ? "section" : "sections"}
                    </Text>
                  </View>
                  <View style={styles.reviewColumn}>
                    <Text style={styles.reviewColumnLabel}>Editable plan</Text>
                    <Text style={styles.reviewColumnBody}>
                      {editing ? "Edits enabled" : "Preview mode"}
                    </Text>
                  </View>
                </View>
                {visibleDraft.sections.map((section, index) =>
                  editing ? (
                    <View key={`${section.title}-${index}`} style={styles.stack}>
                      <FormField
                        label={`Section ${index + 1}`}
                        value={section.title}
                        onChangeText={(value) => updateSection(index, "title", value)}
                      />
                      <FormField
                        label="Notes"
                        value={section.body}
                        onChangeText={(value) => updateSection(index, "body", value)}
                        multiline
                      />
                    </View>
                  ) : (
                    <ListRow key={section.title} title={section.title} subtitle={section.body} />
                  ),
                )}
              </GlassCard>

              <GlassCard variant="warning" contentStyle={styles.safetyContent}>
                <Text style={styles.cardTitle}>Safety panel</Text>
                <DetailRow
                  label="Blocked"
                  value="None detected"
                  trailing={<StatusChip status="Clear" tone="lime" />}
                />
                <DetailRow
                  label="Medical-risk check"
                  value="Clear"
                  trailing={<StatusChip status="Clear" tone="lime" />}
                />
                <DetailRow
                  label="Trainer approval"
                  value="Required"
                  trailing={<StatusChip status="Required" tone="amber" />}
                />
                <Text style={styles.cardBody}>This draft is not visible to the client yet.</Text>
              </GlassCard>

              <GlassCard variant="compact" contentStyle={styles.auditContent}>
                <View style={styles.auditHeader}>
                  <IconBubble icon="clipboard-outline" tone="blue" size={34} />
                  <View style={styles.summaryCopy}>
                    <Text style={styles.cardTitle}>Audit note</Text>
                    <Text style={styles.cardBody}>Recent draft generation and trainer edits.</Text>
                  </View>
                </View>
                {auditLog.length ? (
                  auditLog.map((entry) => (
                    <DetailRow key={entry.id} label={entry.at} value={entry.label} />
                  ))
                ) : (
                  <DetailRow label="Pending" value="Generate or edit the draft to start the log." />
                )}
              </GlassCard>

              <View style={styles.actionRow}>
                <ZookButton
                  onPress={() => void assignDraft()}
                  style={styles.actionHalf}
                  icon="checkmark-circle-outline"
                  disabled={saving || generating}
                >
                  Assign Plan
                </ZookButton>
                <SecondaryButton
                  onPress={() => (editing ? void saveDraftEdits() : setEditing(true))}
                  style={styles.actionHalf}
                  disabled={saving || generating}
                >
                  {editing ? "Save Edits" : "Edit Draft"}
                </SecondaryButton>
              </View>
              <Pressable
                onPress={() => {
                  setDraft(null);
                  setStatus("Draft discarded before assignment.");
                  appendAudit("Draft discarded before assignment.");
                }}
                accessibilityRole="button"
                style={styles.discardButton}
              >
                <Text style={styles.discardText}>Discard</Text>
              </Pressable>
            </>
          ) : (
            <EmptyState
              title="No draft ready"
              body="Generate a draft only after confirming the client goal and constraints."
              action={
                <ZookButton
                  onPress={() => void generateDraft()}
                  icon="sparkles-outline"
                  disabled={!canGeneratePlan || generating}
                  onLongPress={!canGeneratePlan ? showOwnerApprovalRequired : undefined}
                >
                  {generating ? "Generating..." : "Generate Draft"}
                </ZookButton>
              }
            />
          )}

          {status ? (
            <GlassCard variant="success" contentStyle={styles.statusContent}>
              <Text style={styles.statusText}>{status}</Text>
            </GlassCard>
          ) : null}
        </KeyboardAwareScreen>
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
  clientContextGrid: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
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
  reviewColumns: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  reviewColumn: {
    flex: 1,
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: 10,
    gap: 4,
  },
  reviewColumnLabel: {
    color: colors.text,
    ...typography.caption,
  },
  reviewColumnBody: {
    color: colors.muted,
    ...typography.small,
  },
  safetyContent: {
    gap: 8,
  },
  auditContent: {
    gap: 10,
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
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
