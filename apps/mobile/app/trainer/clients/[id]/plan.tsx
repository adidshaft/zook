import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FormField,
  Card,
  AppHeader,
  QueryErrorState,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  clientDetailTabs,
  fitnessGoalFor,
  planTemplates,
  selectedTrainerClient,
  trainerClientDetailPath,
  type ClientDetailTab,
  type PlanTemplateId,
} from "@/features/trainer/helpers";
import { getApiErrorMessage, useAuth, useHasPermission } from "@/lib/auth";
import { plansApi, trainerApi } from "@/lib/domain-api";
import { useOrgExerciseTemplates, useSaveExerciseTemplate, useTrainerClients, type ExerciseTemplateRecord } from "@/lib/domains";
import { useClientDietPlans } from "@/lib/domains/trainer/queries";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type InlineNotice = { message: string; tone: "info" | "warning" | "danger" };

const clientDetailTabLabelKeys: Record<ClientDetailTab, TranslationKey> = {
  overview: "trainer.clientDetail.overviewTab",
  plan: "trainer.clientDetail.planTab",
  sessions: "trainer.clientDetail.sessionsTab",
};

const planTemplateLabelKeys: Record<PlanTemplateId, TranslationKey> = {
  diet: "trainer.clientPlan.templateDiet",
  machine: "trainer.clientPlan.templateMachine",
  recovery: "trainer.clientPlan.templateRecovery",
  routine: "trainer.clientPlan.templateRoutine",
  workout: "trainer.clientPlan.templateWorkout",
};

function exerciseNameForTemplate(templateId: PlanTemplateId, t: (key: TranslationKey) => string) {
  switch (templateId) {
    case "diet":
      return t("trainer.clientPlan.exerciseNutritionCheckIn");
    case "routine":
      return t("trainer.clientPlan.exerciseWeeklyRoutineReview");
    case "machine":
      return t("trainer.clientPlan.exerciseMachineSetup");
    case "recovery":
      return t("trainer.clientPlan.exerciseRecoveryMobility");
    case "workout":
    default:
      return t("trainer.clientPlan.exerciseGobletSquat");
  }
}

function exerciseFromTemplate(template?: ExerciseTemplateRecord | null) {
  if (!template) return null;
  return {
    name: template.name,
    sets: template.defaultSets ?? 3,
    reps: template.defaultReps ? String(template.defaultReps) : "8-12",
    restSeconds: template.defaultRestSeconds ?? 90,
    equipment: template.equipment ?? undefined,
    muscleGroup: template.muscleGroup ?? undefined,
    tempo: template.tempo ?? undefined,
    notes: template.notes ?? undefined,
  };
}

export default function TrainerClientPlanScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const canPublishAssignedPlan = useHasPermission("PLANS_PUBLISH_ASSIGNED");
  const clientsQuery = useTrainerClients();
  const exerciseTemplatesQuery = useOrgExerciseTemplates();
  const saveExerciseTemplate = useSaveExerciseTemplate();
  const client = selectedTrainerClient(clientsQuery.data?.clients, id);
  const clientName = client?.user?.name ?? t("trainer.pt.clientFallback");
  const fitnessGoal = fitnessGoalFor(client, t("trainer.clients.generalFitness"));
  const [status, setStatus] = useState<InlineNotice | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplateId>("workout");
  const [selectedExerciseTemplateId, setSelectedExerciseTemplateId] = useState<string | null>(null);
  const [showExerciseTemplates, setShowExerciseTemplates] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlan, setSavedPlan] = useState<{ id: string; title: string } | null>(null);
  const [dietTitle, setDietTitle] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("2000");
  const [proteinG, setProteinG] = useState("120");
  const [dietStatus, setDietStatus] = useState<InlineNotice | null>(null);
  const priorDietPlansQuery = useClientDietPlans(client?.memberUserId ?? id);
  const previousDietPlan = priorDietPlansQuery.data?.plans?.[0];
  const dietPrefilledRef = useRef(false);
  const translatedClientDetailTabs = clientDetailTabs.map((tab) => ({
    ...tab,
    label: t(clientDetailTabLabelKeys[tab.value]),
  }));

  useEffect(() => {
    if (dietPrefilledRef.current || !previousDietPlan) return;
    dietPrefilledRef.current = true;
    setDietTitle(previousDietPlan.title ?? "");
    if (previousDietPlan.calorieTarget) setCalorieTarget(String(previousDietPlan.calorieTarget));
    if (previousDietPlan.proteinG) setProteinG(String(previousDietPlan.proteinG));
  }, [previousDietPlan]);

  const noticeTextColor = {
    info: palette.feedback.info,
    warning: palette.feedback.warning,
    danger: palette.feedback.danger,
  };
  const noticeCardVariant = {
    info: "compact",
    warning: "warning",
    danger: "danger",
  } as const;

  function buildPlanPayload() {
    const template = planTemplates.find((item) => item.id === selectedTemplate) ?? planTemplates[0]!;
    const selectedExerciseTemplate =
      exerciseTemplatesQuery.data?.templates.find((entry) => entry.id === selectedExerciseTemplateId) ?? null;
    const templateExercise = exerciseFromTemplate(selectedExerciseTemplate);
    const starterExercise = exerciseNameForTemplate(template.id, t);
    return {
      title: planTitle.trim() || `${clientName} ${template.label.toLowerCase()} plan`,
      type: "WORKOUT",
      description: `Trainer-created plan for ${clientName}. Goal: ${fitnessGoal}.`,
      visibility: "selected",
      aiGenerated: false,
      content: {
        goal: fitnessGoal,
        template: template.id,
        exerciseTemplateId: selectedExerciseTemplate?.id ?? null,
        sections: [{ title: template.title, body: template.body }],
        exercises: [
          templateExercise ?? {
            name: starterExercise,
            sets: 3,
            reps: "8-12",
            restSeconds: 90,
            notes: template.body,
          },
        ],
      },
    };
  }

  function saveCurrentExerciseAsTemplate() {
    const payload = buildPlanPayload().content.exercises[0];
    saveExerciseTemplate.mutate({
      body: {
        scope: "TRAINER",
        name: payload.name,
        equipment: "equipment" in payload ? payload.equipment ?? null : null,
        muscleGroup: "muscleGroup" in payload ? payload.muscleGroup ?? null : null,
        defaultSets: typeof payload.sets === "number" ? payload.sets : Number.parseInt(String(payload.sets), 10) || 3,
        defaultReps: Number.parseInt(String(payload.reps), 10) || null,
        defaultRestSeconds: payload.restSeconds ?? null,
        notes: payload.notes ?? null,
      },
    });
  }

  async function saveDraft() {
    if (!token || !activeOrgId || !client) {
      setStatus({ message: t("trainer.clientPlan.selectClientBeforeSaving"), tone: "warning" });
      return null;
    }
    setSavingPlan(true);
    setStatus(null);
    try {
      const result = await plansApi.create<{ plan: { id: string; title: string } }>({
        token,
        orgId: activeOrgId,
        body: buildPlanPayload(),
      });
      setSavedPlan({ id: result.plan.id, title: result.plan.title });
      setStatus({ message: t("trainer.clientPlan.savedDraftStatus", { title: result.plan.title }), tone: "info" });
      showToast({ tone: "success", haptic: "success", message: t("trainer.clientPlan.draftSaved") });
      return result.plan;
    } catch (error) {
      const message = getApiErrorMessage(error);
      setStatus({ message, tone: "danger" });
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
      return null;
    } finally {
      setSavingPlan(false);
    }
  }

  async function assignPlan() {
    if (!token || !activeOrgId || !client) {
      setStatus({ message: t("trainer.clientPlan.selectClientBeforeAssigning"), tone: "warning" });
      return;
    }
    setSavingPlan(true);
    setStatus(null);
    try {
      const nextPlanTitle = planTitle.trim() || `${clientName} workout plan`;
      const existingPlan = savedPlan && savedPlan.title === nextPlanTitle ? savedPlan : null;
      const plan =
        existingPlan ??
        (await plansApi
          .create<{ plan: { id: string; title: string } }>({ token, orgId: activeOrgId, body: buildPlanPayload() })
          .then((result) => result.plan));
      if (!plan) {
        throw new Error(t("trainer.clientPlan.planCouldNotBeCreated"));
      }
      await plansApi.assign({
        token,
        orgId: activeOrgId,
        planId: plan.id,
        assignedToUserId: client.memberUserId,
        audience: "selected_member",
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
      setSavedPlan({ id: plan.id, title: plan.title });
      setStatus({ message: t("trainer.clientPlan.assignedStatus", { title: plan.title, name: clientName }), tone: "info" });
      showToast({ tone: "success", haptic: "success", message: t("trainer.clientPlan.planAssigned") });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setStatus({ message, tone: "danger" });
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setSavingPlan(false);
    }
  }

  async function publishDietPlan() {
    if (!token || !activeOrgId || !client || !client.trainerUserId) {
      setDietStatus({ message: t("trainer.clientPlan.selectClientBeforeDiet"), tone: "warning" });
      return;
    }
    setSavingPlan(true);
    setDietStatus(null);
    try {
      const title = dietTitle.trim() || `${clientName} diet plan`;
      const result = await trainerApi.createClientDietPlan<{ plan: { id: string; title: string } }>({
        token,
        orgId: activeOrgId,
        trainerUserId: client.trainerUserId,
        clientId: client.memberUserId,
        body: {
          title,
          status: "PUBLISHED",
          calorieTarget: Number.parseInt(calorieTarget, 10) || 2000,
          proteinG: Number.parseInt(proteinG, 10) || 120,
          carbsG: 220,
          fatsG: 60,
          meals: [
            { name: "Breakfast", timeOfDay: "08:00", calories: 450, proteinG: 25, carbsG: 55, fatsG: 12, items: ["Poha or oats", "Curd"], order: 0 },
            { name: "Lunch", timeOfDay: "13:00", calories: 650, proteinG: 35, carbsG: 80, fatsG: 18, items: ["Roti", "Dal", "Sabzi"], order: 1 },
            { name: "Snack", timeOfDay: "17:00", calories: 250, proteinG: 20, carbsG: 25, fatsG: 8, items: ["Fruit", "Whey or paneer"], order: 2 },
            { name: "Dinner", timeOfDay: "20:30", calories: 550, proteinG: 40, carbsG: 55, fatsG: 16, items: ["Rice", "Protein", "Salad"], order: 3 },
          ],
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] });
      setDietStatus({ message: t("trainer.clientPlan.dietPublishedStatus", { title: result.plan.title, name: clientName }), tone: "info" });
      showToast({ tone: "success", haptic: "success", message: t("trainer.clientPlan.dietPlanPublished") });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDietStatus({ message, tone: "danger" });
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setSavingPlan(false);
    }
  }

  function selectTab(tab: ClientDetailTab) {
    router.replace(trainerClientDetailPath(id, tab) as never);
  }

  return (
    <>
      <ZookScreen testID="trainer-client-plan-screen">
        <ScrollView ref={scrollRef} contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader
            title={t("trainer.clientSessions.title")}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientSessions.backToClients")}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
          />
          <SegmentedControl options={translatedClientDetailTabs} value="plan" onChange={selectTab} />
          <Card contentStyle={styles.stack}>
            <SectionHeader title={t("trainer.clientPlan.planBuilder")} />
            <FormField testID="trainer-plan-title" label={t("trainer.clientDiet.planTitle")} value={planTitle} onChangeText={setPlanTitle} />
            <View style={styles.chipRow}>
              {planTemplates.map((template) => {
                const selected = template.id === selectedTemplate;
                return (
                  <Pressable
                    key={template.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedTemplate(template.id)}
                    style={({ pressed }) => [
                      styles.templateChip,
                      {
                        backgroundColor: selected ? palette.surface.accentSoft : palette.surface.raised,
                        borderColor: selected ? palette.accent.base : palette.border.default,
                      },
                      pressed ? styles.controlPressed : null,
                    ]}
                  >
                    <Ionicons name={template.icon} size={15} color={selected ? palette.accent.base : palette.text.secondary} />
                    <Text style={[styles.templateChipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>
                      {t(planTemplateLabelKeys[template.id])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {exerciseTemplatesQuery.data?.templates.length ? (
              <View style={styles.disclosureStack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showExerciseTemplates }}
                  onPress={() => setShowExerciseTemplates((current) => !current)}
                  style={({ pressed }) => [styles.disclosureHeader, pressed ? styles.controlPressed : null]}
                >
                  <View style={[styles.disclosureIcon, { backgroundColor: palette.surface.accentSoft }]}>
                    <Ionicons name="barbell-outline" size={18} color={palette.accent.base} />
                  </View>
                  <View style={styles.disclosureCopy}>
                    <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>
                      {t("trainer.clientPlan.exerciseTemplates")}
                    </Text>
                    <Text style={[styles.disclosureBody, { color: palette.text.secondary }]} numberOfLines={1}>
                      {selectedExerciseTemplateId
                        ? exerciseTemplatesQuery.data.templates.find((template) => template.id === selectedExerciseTemplateId)?.name
                        : t("trainer.clientPlan.templateNotes")}
                    </Text>
                  </View>
                  <Ionicons name={showExerciseTemplates ? "chevron-up" : "chevron-down"} size={18} color={palette.text.tertiary} />
                </Pressable>
                {showExerciseTemplates ? (
                  <View style={styles.chipRow}>
                    {exerciseTemplatesQuery.data.templates.slice(0, 10).map((template) => {
                      const selected = selectedExerciseTemplateId === template.id;
                      return (
                        <Pressable
                          key={template.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedExerciseTemplateId(selected ? null : template.id)}
                          style={({ pressed }) => [
                            styles.templateChip,
                            {
                              backgroundColor: selected ? palette.surface.accentSoft : palette.surface.raised,
                              borderColor: selected ? palette.accent.base : palette.border.default,
                            },
                            pressed ? styles.controlPressed : null,
                          ]}
                        >
                          <Ionicons name={template.featured ? "star" : "barbell-outline"} size={15} color={selected ? palette.accent.base : palette.text.secondary} />
                          <Text style={[styles.templateChipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{template.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.planActionRow}>
              <ZookButton testID="trainer-save-draft-button" onPress={() => void saveDraft()} icon="save-outline" disabled={savingPlan} style={styles.actionHalf}>{t("trainer.clientPlan.saveDraft")}</ZookButton>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientPlan.templateNotes")}
                disabled={!client || savingPlan}
                hitSlop={8}
                onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
                style={({ pressed }) => [
                  styles.compactAction,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                  !client || savingPlan ? styles.disabledAction : null,
                ]}
              >
                <Ionicons name="document-text-outline" size={18} color={palette.text.secondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientPlan.saveExerciseTemplate")}
                disabled={saveExerciseTemplate.isPending}
                hitSlop={8}
                onPress={saveCurrentExerciseAsTemplate}
                style={({ pressed }) => [
                  styles.compactAction,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                  saveExerciseTemplate.isPending ? styles.disabledAction : null,
                ]}
              >
                <Ionicons name={saveExerciseTemplate.isPending ? "hourglass-outline" : "bookmark-outline"} size={18} color={palette.text.secondary} />
              </Pressable>
            </View>
            <SecondaryButton
              testID="trainer-publish-plan-button"
              onPress={() => Alert.alert(t("trainer.clientPlan.publishToClientTitle", { name: clientName }), t("trainer.clientPlan.publishBody"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("trainer.clientDiet.publish"), onPress: () => void assignPlan() }])}
              disabled={!canPublishAssignedPlan || savingPlan}
              onLongPress={!canPublishAssignedPlan ? () => showToast({ title: t("owner.approvals.ownerApprovalRequired"), tone: "amber" }) : undefined}
            >
              {t("trainer.clientDiet.publish")}
            </SecondaryButton>
          </Card>
          {savedPlan ? (
            <Card variant="warning" contentStyle={styles.draftPromptContent}>
              <Text style={[styles.cardBody, { color: palette.text.secondary }]}>{t("trainer.clientPlan.draftPrompt", { title: savedPlan.title })}</Text>
            </Card>
          ) : null}
          {status ? (
            <Card variant={noticeCardVariant[status.tone]} contentStyle={styles.statusContent}>
              <Text style={[styles.statusText, { color: noticeTextColor[status.tone] }]}>
                {status.message}
              </Text>
            </Card>
          ) : null}
          <SectionHeader title={t("trainer.clientDiet.previousPlan")} />
          {priorDietPlansQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stack}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={44} />
            </Card>
          ) : null}
          {priorDietPlansQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState error={priorDietPlansQuery.error} onRetry={() => void priorDietPlansQuery.refetch()} />
            </Card>
          ) : null}
          {!priorDietPlansQuery.isLoading && !priorDietPlansQuery.isError ? (
            previousDietPlan ? (
              <Card variant="compact" contentStyle={styles.stack}>
                <Text style={[styles.cardBody, { color: palette.text.primary }]}>{previousDietPlan.title}</Text>
                <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                  {previousDietPlan.calorieTarget ? t("trainer.clientDiet.kcalTargetPrefix", { kcal: previousDietPlan.calorieTarget }) : ""}
                  {previousDietPlan.proteinG ? t("trainer.clientPlan.proteinPrefix", { protein: previousDietPlan.proteinG }) : ""}
                  {t("trainer.clientDiet.mealCount", { count: previousDietPlan.meals?.length ?? 0 })}
                </Text>
              </Card>
            ) : (
              <Card variant="compact" contentStyle={styles.stack}>
                <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                  {t("trainer.clientPlan.noDietPlanForClient", { name: clientName })}
                </Text>
              </Card>
            )
          ) : null}

          <Card contentStyle={styles.stack}>
            <SectionHeader title={t("trainer.clientDiet.title")} />
            <FormField testID="trainer-diet-title" label={t("trainer.clientPlan.dietTitle")} value={dietTitle} onChangeText={setDietTitle} placeholder={t("trainer.clientPlan.clientDietPlanPlaceholder", { name: clientName })} />
            <View style={styles.numericStack}>
              <FormField label={t("trainer.clientPlan.calories")} value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="number-pad" style={styles.actionHalf} />
              <FormField label={t("trainer.clientPlan.proteinG")} value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" style={styles.actionHalf} />
            </View>
            <SecondaryButton testID="trainer-publish-diet-button" onPress={() => void publishDietPlan()} disabled={!client || savingPlan}>
              {t("trainer.clientPlan.publishFourMealDiet")}
            </SecondaryButton>
          </Card>
          {dietStatus ? (
            <Card variant={noticeCardVariant[dietStatus.tone]} contentStyle={styles.statusContent}>
              <Text style={[styles.statusText, { color: noticeTextColor[dietStatus.tone] }]}>
                {dietStatus.message}
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.sm, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding + 32, paddingTop: layout.screenContentTopPadding, width: "100%" },
  iconButton: { alignItems: "center", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  controlPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  backIcon: { fontSize: 26, lineHeight: 28 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sectionLabel: { ...typography.caption },
  templateChip: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 14 },
  templateChipText: { ...typography.caption },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  planActionRow: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  actionHalf: { flex: 1 },
  numericStack: { gap: spacing.sm },
  compactAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  disabledAction: { opacity: 0.45 },
  disclosureStack: { gap: spacing.sm },
  disclosureHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  disclosureIcon: { alignItems: "center", borderRadius: 14, height: 38, justifyContent: "center", width: 38 },
  disclosureCopy: { flex: 1, gap: 2, minWidth: 0 },
  disclosureTitle: { ...typography.bodyStrong },
  disclosureBody: { ...typography.small },
  stack: { gap: spacing.sm },
  draftPromptContent: { gap: spacing.sm },
  cardBody: { ...typography.body },
  statusContent: { padding: 14 },
  statusText: { ...typography.bodyStrong },
});
