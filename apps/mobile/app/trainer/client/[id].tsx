import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AuditWarning,
  BottomNav,
  FormField,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { plansApi, trainerApi } from "@/lib/domain-api";
import { useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type ClientTab = "summary" | "plans" | "progress" | "notes";
type PlanTemplateId = "workout" | "diet" | "routine" | "machine" | "recovery";

const planTemplates: Array<{
  id: PlanTemplateId;
  label: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "workout",
    label: "Workout",
    title: "Workout focus",
    body: "Add exercises, sets, rest periods, and coaching cues before assignment.",
    icon: "barbell-outline",
  },
  {
    id: "diet",
    label: "Diet",
    title: "Nutrition focus",
    body: "Add meal timing, protein targets, hydration notes, and restriction-safe guidance.",
    icon: "nutrition-outline",
  },
  {
    id: "routine",
    label: "Routine",
    title: "Weekly routine",
    body: "Map training days, recovery days, mobility work, and check-in cadence.",
    icon: "calendar-outline",
  },
  {
    id: "machine",
    label: "Machine Guide",
    title: "Machine guide",
    body: "List machine setup, safe range of motion, warm-up load, and progression rules.",
    icon: "construct-outline",
  },
  {
    id: "recovery",
    label: "Recovery",
    title: "Recovery plan",
    body: "Add sleep, mobility, deload, and soreness-management notes for the week.",
    icon: "leaf-outline",
  },
];

function planCountLabel(count: number) {
  return `${count} active ${count === 1 ? "plan" : "plans"}`;
}

function initialsFor(name?: string | null) {
  const cleanName = name?.trim();
  if (!cleanName) return "ZK";
  return cleanName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const tabs: Array<{ label: string; value: ClientTab }> = [
  { label: "Summary", value: "summary" },
  { label: "Plans", value: "plans" },
  { label: "Progress", value: "progress" },
  { label: "Notes", value: "notes" },
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isClientTab(value: string | undefined): value is ClientTab {
  return value === "summary" || value === "plans" || value === "progress" || value === "notes";
}

export default function TrainerClientDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; tab?: string | string[] }>();
  const { id } = params;
  const clientId = id ?? "";
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const canPublishAssignedPlan = useHasPermission("PLANS_PUBLISH_ASSIGNED");
  const tabParam = firstParam(params.tab);
  const tab: ClientTab = isClientTab(tabParam) ? tabParam : "summary";
  const [status, setStatus] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplateId>("workout");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlan, setSavedPlan] = useState<{ id: string; title: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const clientsQuery = useTrainerClients();
  const client =
    clientsQuery.data?.clients.find((candidate) => candidate.memberUserId === clientId) ?? null;
  const clientName = client?.user?.name ?? (clientsQuery.isLoading ? "Client" : "Client not found");
  const fitnessGoal =
    client?.summary?.fitnessGoal ?? client?.profile?.fitnessGoal ?? "General fitness";
  const activePlans = client?.summary?.activePlans ?? 0;
  const recentFeedback = client?.summary?.recentFeedback ?? [];
  const recentWorkouts = client?.summary?.recentWorkouts ?? [];
  const averageCompletion = recentFeedback.length
    ? Math.round(
        recentFeedback.reduce((sum, entry) => sum + (entry.completionPct ?? 0), 0) /
          recentFeedback.length,
      )
    : null;
  const progressTimeline = [
    ...recentFeedback.map((entry) => ({
      id: `feedback-${entry.assignmentId}-${entry.updatedAt ?? "latest"}`,
      at: entry.updatedAt ?? "",
      title: entry.feedback ? "Plan feedback" : "Plan progress",
      body: entry.feedback ?? `${entry.completionPct}% complete`,
      status: `${entry.completionPct}%`,
      tone: "lime" as const,
    })),
    ...recentWorkouts.map((workout) => ({
      id: `workout-${workout.id}`,
      at: workout.startedAt ?? "",
      title: workout.title,
      body: [
        workout.workoutType,
        workout.durationMinutes ? `${workout.durationMinutes} min` : null,
        workout.notes,
      ]
        .filter(Boolean)
        .join(" · "),
      status: "Logged",
      tone: "blue" as const,
    })),
  ].sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime());
  const showOwnerApprovalRequired = () => {
    showToast({ title: "Owner approval required", tone: "amber" });
  };
  const setTab = (nextTab: ClientTab) => {
    router.setParams({ tab: nextTab });
  };

  useEffect(() => {
    setNoteText(client?.summary?.trainerNote ?? "");
    setNoteSaved(false);
  }, [client?.memberUserId, client?.summary?.trainerNote]);

  function buildPlanPayload() {
    const template = planTemplates.find((item) => item.id === selectedTemplate) ?? planTemplates[0]!;
    return {
      title: planTitle.trim() || `${clientName} ${template.label.toLowerCase()} plan`,
      type: "WORKOUT",
      description: `Trainer-created plan for ${clientName}. Goal: ${fitnessGoal}.`,
      visibility: "selected",
      aiGenerated: false,
      content: {
        goal: fitnessGoal,
        template: template.id,
        sections: [
          {
            title: template.title,
            body: template.body,
          },
        ],
        exercises: [],
      },
    };
  }

  async function saveDraft() {
    if (!token || !activeOrgId || !client) {
      setStatus("Select a client before saving.");
      return null;
    }
    setSavingPlan(true);
    setStatus("");
    try {
      const result = await plansApi.create<{ plan: { id: string; title: string } }>({
        token,
        orgId: activeOrgId,
        body: buildPlanPayload(),
      });
      setSavedPlan({ id: result.plan.id, title: result.plan.title });
      setStatus(`${result.plan.title} saved as a draft.`);
      showToast({ tone: "success", haptic: "success", message: "Draft saved." });
      return result.plan;
    } catch (error) {
      const message = getApiErrorMessage(error);
      setStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
      return null;
    } finally {
      setSavingPlan(false);
    }
  }

  async function assignPlan() {
    if (!token || !activeOrgId || !client) {
      setStatus("Select a client before assigning.");
      return;
    }
    setSavingPlan(true);
    setStatus("");
    try {
      const nextPlanTitle = planTitle.trim() || `${clientName} workout plan`;
      const existingPlan = savedPlan && savedPlan.title === nextPlanTitle ? savedPlan : null;
      const plan =
        existingPlan ??
        (await plansApi
          .create<{ plan: { id: string; title: string } }>({
            token,
            orgId: activeOrgId,
            body: buildPlanPayload(),
          })
          .then((result) => result.plan));
      if (!plan) {
        throw new Error("Plan could not be created.");
      }
      setSavedPlan({ id: plan.id, title: plan.title });
      try {
        await plansApi.assign({
          token,
          orgId: activeOrgId,
          planId: plan.id,
          assignedToUserId: client.memberUserId,
          audience: "selected_member",
        });
      } catch (assignError) {
        if (!existingPlan) {
          await plansApi.delete({ token, orgId: activeOrgId, planId: plan.id }).catch(() => undefined);
          setSavedPlan(null);
        }
        throw assignError;
      }
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      setStatus(`${plan.title} assigned. ${clientName} can now see it.`);
      showToast({ tone: "success", haptic: "success", message: "Plan assigned." });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    } finally {
      setSavingPlan(false);
    }
  }

  async function saveNote() {
    if (!token || !activeOrgId || !client || !client.trainerUserId) {
      setStatus("Select a client before saving a note.");
      return;
    }
    setNoteSaved(false);
    setStatus("");
    try {
      await trainerApi.updateClientNote({
        token,
        orgId: activeOrgId,
        trainerUserId: client.trainerUserId,
        clientId: client.memberUserId,
        note: noteText,
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      setNoteSaved(true);
      setStatus("Trainer note saved.");
      showToast({ tone: "success", haptic: "success", message: "Trainer note saved." });
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    }
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
            title="Client Detail"
            subtitle=""
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer"))}
                accessibilityRole="button"
                accessibilityLabel="Back to trainer"
                style={styles.iconButton}
              >
                <Text style={styles.backIcon}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />

          {!clientsQuery.isLoading && !client ? (
            <GlassCard variant="compact" contentStyle={styles.notFoundContent}>
              <IconBubble icon="person-outline" tone="neutral" size={42} />
              <View style={styles.clientCopy}>
                <Text style={styles.cardTitle}>Client not found</Text>
                <Text style={styles.cardBody}>Select a client from your list to view details.</Text>
              </View>
              <ZookButton href="/trainer?view=clients" tone="secondary" icon="people-outline">
                Back to clients
              </ZookButton>
            </GlassCard>
          ) : null}

          <GlassCard variant="compact" contentStyle={styles.clientHeroContent}>
            <View style={styles.clientHeroTop}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarText}>{initialsFor(clientName)}</Text>
                <View style={styles.clientAvatarDot} />
              </View>
              <View style={styles.clientHeroCopy}>
                <Text numberOfLines={1} style={styles.clientHeroName}>{clientName}</Text>
                <View style={styles.clientStatusRow}>
                  <Ionicons name="person-outline" size={21} color={colors.lime} />
                  <Text style={styles.clientStatusText}>
                    {client?.active ? "Active member" : "Paused member"}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.clientHeroMetrics}>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="navigate-circle-outline" size={22} color={colors.lime} />
                <Text style={styles.metricLabel}>Goal</Text>
                <Text numberOfLines={1} style={styles.metricValue}>{fitnessGoal}</Text>
              </View>
              <View style={styles.clientHeroMetric}>
                <Ionicons name="barbell-outline" size={22} color={colors.lime} />
                <Text style={styles.metricLabel}>PT pack</Text>
                <Text numberOfLines={1} style={styles.metricValue}>
                  {activePlans ? `${activePlans} active plans` : "Create first plan"}
                </Text>
              </View>
            </View>
            <View style={styles.trackingRow}>
              <View style={styles.trackingLabel}>
                <Ionicons name="pulse-outline" size={20} color={colors.lime} />
                <Text style={styles.metricLabel}>Tracking</Text>
              </View>
              <StatusChip status={client?.active ? "Opted in" : "Paused"} tone="lime" />
            </View>
          </GlassCard>

          <View style={styles.actionRow}>
            <ZookButton
              onPress={() => setTab("plans")}
              disabled={!client}
              style={styles.actionHalf}
              icon="add-circle-outline"
            >
              Create Plan
            </ZookButton>
            <SecondaryButton
              disabled={!client}
              onPress={() => router.push(`/trainer/client/${clientId}/ai-draft` as never)}
              icon="sparkles-outline"
              style={styles.actionHalf}
            >
              Generate AI Draft
            </SecondaryButton>
          </View>

          <SegmentedControl options={tabs} value={tab} onChange={setTab} />

          {tab === "summary" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              <ListRow
                title="Fitness goal"
                subtitle={fitnessGoal}
                trailing={<StatusChip status={client?.active ? "Active" : "Paused"} />}
              />
              <ListRow
                title="Diet note"
                subtitle={client?.summary?.dietPreference ?? "Not shared"}
                trailing={<StatusChip status="Visible" tone="neutral" />}
              />
              <ListRow
                title="Allergy note"
                subtitle={client?.summary?.allergies ?? "None added"}
                trailing={<StatusChip status="Clear" tone="neutral" />}
              />
              <ListRow
                title="Last check-in"
                subtitle={recentWorkouts[0]?.startedAt ?? "Today 7:14 AM"}
                trailing={<StatusChip status="Tracked" tone="neutral" />}
              />
              <ListRow
                title="Recent progress"
                subtitle={
                  averageCompletion === null
                    ? planCountLabel(activePlans)
                    : `${averageCompletion}% average plan completion`
                }
                trailing={<StatusChip status={averageCompletion === null ? "Review" : `${averageCompletion}%`} tone="amber" />}
              />
            </GlassCard>
          ) : null}

          {tab === "plans" ? (
            <GlassCard contentStyle={styles.stack}>
              <SectionHeader
                title="Plan builder"
                subtitle="Create a trainer-owned draft before assigning."
              />
              <FormField label="Plan title" value={planTitle} onChangeText={setPlanTitle} />
              <View style={styles.chipRow}>
                {planTemplates.map((template) => {
                  const selected = template.id === selectedTemplate;
                  return (
                    <Pressable
                      key={template.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedTemplate(template.id)}
                      style={[styles.templateChip, selected ? styles.templateChipSelected : null]}
                    >
                      <Ionicons
                        name={template.icon}
                        size={15}
                        color={selected ? colors.lime : colors.muted}
                      />
                      <Text style={[styles.templateChipText, selected ? styles.templateChipTextSelected : null]}>
                        {template.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.actionRow}>
                <ZookButton
                  onPress={() => void saveDraft()}
                  icon="save-outline"
                  disabled={savingPlan}
                  style={styles.actionHalf}
                >
                  Save draft
                </ZookButton>
                <SecondaryButton
                  onPress={() => router.push(`/trainer/client/${clientId}/ai-draft` as never)}
                  disabled={!client || savingPlan}
                  style={styles.actionHalf}
                >
                  Generate AI Draft
                </SecondaryButton>
              </View>
              <SecondaryButton
                onPress={() =>
                  Alert.alert(`Publish to ${clientName}?`, "The member will see this plan immediately.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Publish", onPress: () => void assignPlan() },
                  ])
                }
                disabled={!canPublishAssignedPlan || savingPlan}
                onLongPress={!canPublishAssignedPlan ? showOwnerApprovalRequired : undefined}
              >
                Publish to {clientName}
              </SecondaryButton>
            </GlassCard>
          ) : null}

          {tab === "progress" ? (
            <GlassCard variant="compact" contentStyle={styles.stack}>
              <ListRow
                title="Adherence"
                subtitle={
                  averageCompletion === null
                    ? "Waiting for member feedback and workout logs."
                    : `${averageCompletion}% average completion across recent plan feedback.`
                }
                leading={<IconBubble icon="analytics-outline" tone="lime" />}
                trailing={<StatusChip status={averageCompletion === null ? "Waiting" : `${averageCompletion}%`} tone={averageCompletion === null ? "neutral" : "lime"} />}
              />
              {progressTimeline.length ? (
                progressTimeline.map((entry) => (
                  <ListRow
                    key={entry.id}
                    title={entry.title}
                    subtitle={entry.body || "No details added."}
                    trailing={<StatusChip status={entry.status} tone={entry.tone} />}
                  />
                ))
              ) : (
                <ListRow
                  title="Plan feedback"
                  subtitle="No member feedback yet."
                  trailing={<StatusChip status="Waiting" tone="neutral" />}
                />
              )}
              <ListRow
                title="Plans"
                subtitle={`${activePlans} active for client`}
                trailing={<StatusChip status="Active" tone="lime" />}
              />
            </GlassCard>
          ) : null}

          {tab === "notes" ? (
            <GlassCard contentStyle={styles.stack}>
              <FormField
                label="Trainer note"
                value={noteText}
                onChangeText={setNoteText}
                multiline
                placeholder="Add coaching note for your own follow-up..."
              />
              <ZookButton
                onPress={() => void saveNote()}
                disabled={!client}
                icon={noteSaved ? "checkmark-outline" : "save-outline"}
              >
                {noteSaved ? "Saved" : "Save note"}
              </ZookButton>
              <AuditWarning>
                Only assigned trainers and owners/admins can see trainer notes.
              </AuditWarning>
            </GlassCard>
          ) : null}

          {savedPlan ? (
            <GlassCard variant="warning" contentStyle={styles.draftPromptContent}>
              <View style={styles.attentionHeader}>
                <IconBubble icon="reader-outline" tone="amber" />
                <View style={styles.clientCopy}>
                  <Text style={styles.cardTitle}>Draft review</Text>
                  <Text style={styles.cardBody}>
                    {savedPlan.title} is saved as a draft. Review before assigning.
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setTab("plans")}>
                <StatusChip status="Continue manual edits" tone="amber" icon="chevron-forward" />
              </Pressable>
            </GlassCard>
          ) : null}

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
    paddingTop: 8,
    gap: 12,
    paddingBottom: layout.bottomNavContentPadding + 32,
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
  clientContent: {
    gap: 14,
  },
  snapshotContent: {
    gap: 10,
  },
  clientHeroContent: {
    padding: 20,
    gap: 18,
  },
  clientHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  clientAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.lime,
    backgroundColor: "rgba(185,244,85,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "Inter_700Bold",
  },
  clientAvatarDot: {
    position: "absolute",
    right: 2,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: colors.bg,
    backgroundColor: colors.lime,
  },
  clientHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  clientHeroName: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  clientStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  clientStatusText: {
    color: colors.lime,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: "Inter_600SemiBold",
  },
  clientHeroMetrics: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  clientHeroMetric: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
  },
  trackingRow: {
    minHeight: 54,
    borderTopWidth: 1,
    borderColor: colors.divider,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  trackingLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notFoundContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  clientTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  clientCopy: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    color: colors.text,
    ...typography.headerTitle,
  },
  cardTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  templateChip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
  },
  templateChipSelected: {
    borderColor: colors.lime,
    backgroundColor: "rgba(185,244,85,0.13)",
  },
  templateChipText: {
    color: colors.muted,
    ...typography.caption,
  },
  templateChipTextSelected: {
    color: colors.lime,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
  },
  stack: {
    gap: 10,
  },
  attentionHeader: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  draftPromptContent: {
    gap: 12,
  },
  statusContent: {
    padding: 14,
  },
  statusText: {
    color: colors.lime,
    ...typography.bodyStrong,
  },
});
