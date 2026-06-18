import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FormField,
  Card,
  IconBubble,
  AppHeader,
  SecondaryButton,
  SegmentedControl,
  SectionHeader,
  StatusChip,
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
import { useTrainerClients } from "@/lib/domains";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

function exerciseNameForTemplate(templateId: PlanTemplateId) {
  switch (templateId) {
    case "diet":
      return "Nutrition check-in";
    case "routine":
      return "Weekly routine review";
    case "machine":
      return "Machine setup walkthrough";
    case "recovery":
      return "Recovery mobility flow";
    case "workout":
    default:
      return "Goblet squat";
  }
}

export default function TrainerClientPlanScreen() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const canPublishAssignedPlan = useHasPermission("PLANS_PUBLISH_ASSIGNED");
  const clientsQuery = useTrainerClients();
  const client = selectedTrainerClient(clientsQuery.data?.clients, id);
  const clientName = client?.user?.name ?? "Client";
  const fitnessGoal = fitnessGoalFor(client);
  const [status, setStatus] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplateId>("workout");
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlan, setSavedPlan] = useState<{ id: string; title: string } | null>(null);
  const [dietTitle, setDietTitle] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("2000");
  const [proteinG, setProteinG] = useState("120");
  const [dietStatus, setDietStatus] = useState("");

  function buildPlanPayload() {
    const template = planTemplates.find((item) => item.id === selectedTemplate) ?? planTemplates[0]!;
    const starterExercise = exerciseNameForTemplate(template.id);
    return {
      title: planTitle.trim() || `${clientName} ${template.label.toLowerCase()} plan`,
      type: "WORKOUT",
      description: `Trainer-created plan for ${clientName}. Goal: ${fitnessGoal}.`,
      visibility: "selected",
      aiGenerated: false,
      content: {
        goal: fitnessGoal,
        template: template.id,
        sections: [{ title: template.title, body: template.body }],
        exercises: [
          {
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
          .create<{ plan: { id: string; title: string } }>({ token, orgId: activeOrgId, body: buildPlanPayload() })
          .then((result) => result.plan));
      if (!plan) {
        throw new Error("Plan could not be created.");
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

  async function publishDietPlan() {
    if (!token || !activeOrgId || !client || !client.trainerUserId) {
      setDietStatus("Select a client before publishing diet.");
      return;
    }
    setSavingPlan(true);
    setDietStatus("");
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
      setDietStatus(`${result.plan.title} published. ${clientName} can log meals now.`);
      showToast({ tone: "success", haptic: "success", message: "Diet plan published." });
    } catch (error) {
      const message = getApiErrorMessage(error);
      setDietStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
            title="Client Detail"
            subtitle={clientName}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/trainer/clients" as never))}
                accessibilityRole="button"
                accessibilityLabel="Back to clients"
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Text style={[styles.backIcon, { color: palette.text.primary }]}>‹</Text>
              </Pressable>
            }
            chip={<StatusChip status="Trainer" tone="neutral" />}
          />
          <SegmentedControl options={clientDetailTabs} value="plan" onChange={selectTab} />
          <Card contentStyle={styles.stack}>
            <SectionHeader title="Plan builder" subtitle="Create a trainer-owned draft before assigning." />
            <FormField testID="trainer-plan-title" label="Plan title" value={planTitle} onChangeText={setPlanTitle} />
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
                    <Text style={[styles.templateChipText, { color: selected ? palette.accent.base : palette.text.secondary }]}>{template.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.actionRow}>
              <ZookButton testID="trainer-save-draft-button" onPress={() => void saveDraft()} icon="save-outline" disabled={savingPlan} style={styles.actionHalf}>Save draft</ZookButton>
              <SecondaryButton testID="trainer-plan-template-help-button" onPress={() => scrollRef.current?.scrollToEnd({ animated: true })} disabled={!client || savingPlan} style={styles.actionHalf}>Template notes</SecondaryButton>
            </View>
            <SecondaryButton
              testID="trainer-publish-plan-button"
              onPress={() => Alert.alert(`Publish to ${clientName}?`, "The member will see this plan immediately.", [{ text: "Cancel", style: "cancel" }, { text: "Publish", onPress: () => void assignPlan() }])}
              disabled={!canPublishAssignedPlan || savingPlan}
              onLongPress={!canPublishAssignedPlan ? () => showToast({ title: "Owner approval required", tone: "amber" }) : undefined}
            >
              Publish to {clientName}
            </SecondaryButton>
          </Card>
          {savedPlan ? (
            <Card variant="warning" contentStyle={styles.draftPromptContent}>
              <View style={styles.attentionHeader}>
                <IconBubble icon="reader-outline" tone="amber" />
                <Text style={[styles.cardBody, { color: palette.text.secondary }]}>{savedPlan.title} is saved as a draft. Review before assigning.</Text>
              </View>
            </Card>
          ) : null}
          {status ? <Card variant="success" contentStyle={styles.statusContent}><Text style={[styles.statusText, { color: palette.accent.base }]}>{status}</Text></Card> : null}
          <Card contentStyle={styles.stack}>
            <SectionHeader title="Diet plan" subtitle="Four-meal publish flow for the assigned client." />
            <FormField testID="trainer-diet-title" label="Diet title" value={dietTitle} onChangeText={setDietTitle} placeholder={`${clientName} diet plan`} />
            <View style={styles.actionRow}>
              <FormField label="Calories" value={calorieTarget} onChangeText={setCalorieTarget} keyboardType="number-pad" style={styles.actionHalf} />
              <FormField label="Protein g" value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" style={styles.actionHalf} />
            </View>
            <SecondaryButton testID="trainer-publish-diet-button" onPress={() => void publishDietPlan()} disabled={!client || savingPlan}>
              Publish 4-meal diet
            </SecondaryButton>
          </Card>
          {dietStatus ? <Card variant="success" contentStyle={styles.statusContent}><Text style={[styles.statusText, { color: palette.accent.base }]}>{dietStatus}</Text></Card> : null}
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
  templateChip: { alignItems: "center", borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 14 },
  templateChipText: { ...typography.caption },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionHalf: { flex: 1 },
  stack: { gap: spacing.sm },
  attentionHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  draftPromptContent: { gap: spacing.sm },
  cardBody: { ...typography.body },
  statusContent: { padding: 14 },
  statusText: { ...typography.bodyStrong },
});
