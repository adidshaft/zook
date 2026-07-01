import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  BranchSelectorChip,
  Card,
  EmptyState,
  FormField,
  HeaderActions,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  ScreenHeader,
  Skeleton,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import {
  useDeleteExerciseTemplate,
  useOrgExerciseTemplates,
  useSaveExerciseTemplate,
  type ExerciseTemplateRecord,
} from "@/lib/domains";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, radii, spacing, typography, useTheme } from "@/lib/theme";

type Translate = (key: TranslationKey, values?: Record<string, string | number>) => string;

function templateMeta(template: ExerciseTemplateRecord, t: Translate) {
  return (
    [
      template.muscleGroup,
      template.equipment,
      template.defaultSets ? t("owner.exerciseLibrary.setsCount", { count: template.defaultSets }) : null,
      template.defaultReps ? t("owner.exerciseLibrary.repsCount", { count: template.defaultReps }) : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("owner.exerciseLibrary.customExercise")
  );
}

function templatePillLabel(template: ExerciseTemplateRecord, t: Translate) {
  if (template.scope === "STARTER") return t("owner.exerciseLibrary.starter");
  if (template.featured) return t("owner.exerciseLibrary.featured");
  return t("owner.exerciseLibrary.shared");
}

export default function OwnerExerciseLibraryScreen() {
  const { palette } = useTheme();
  const t = useT();
  const templatesQuery = useOrgExerciseTemplates();
  const saveTemplate = useSaveExerciseTemplate();
  const deleteTemplate = useDeleteExerciseTemplate();
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ExerciseTemplateRecord | null>(null);
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [restSeconds, setRestSeconds] = useState("90");
  const [tempo, setTempo] = useState("");
  const [notes, setNotes] = useState("");
  const [featured, setFeatured] = useState(false);
  const [showProgrammingDefaults, setShowProgrammingDefaults] = useState(false);

  const templates = templatesQuery.data?.templates ?? [];
  const starters = templates.filter((template) => template.scope === "STARTER");
  const orgTemplates = templates.filter((template) => template.scope === "ORG");
  const canSubmit = name.trim().length >= 2 && !saveTemplate.isPending;
  const programmingSummary =
    [
      sets.trim() ? t("owner.exerciseLibrary.setsCount", { count: sets.trim() }) : null,
      reps.trim() ? t("owner.exerciseLibrary.repsCount", { count: reps.trim() }) : null,
      restSeconds.trim() ? `${t("owner.exerciseLibrary.restSec")}: ${restSeconds.trim()}` : null,
      tempo.trim() ? `${t("owner.exerciseLibrary.tempo")}: ${tempo.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || t("owner.exerciseLibrary.customExercise");

  function resetForm() {
    setEditing(null);
    setName("");
    setMuscleGroup("");
    setEquipment("");
    setSets("3");
    setReps("10");
    setRestSeconds("90");
    setTempo("");
    setNotes("");
    setFeatured(false);
    setShowProgrammingDefaults(false);
    setShowForm(false);
  }

  function startEdit(template: ExerciseTemplateRecord) {
    setEditing(template);
    setName(template.name);
    setMuscleGroup(template.muscleGroup ?? "");
    setEquipment(template.equipment ?? "");
    setSets(template.defaultSets ? String(template.defaultSets) : "");
    setReps(template.defaultReps ? String(template.defaultReps) : "");
    setRestSeconds(template.defaultRestSeconds ? String(template.defaultRestSeconds) : "");
    setTempo(template.tempo ?? "");
    setNotes(template.notes ?? "");
    setFeatured(Boolean(template.featured));
    setShowProgrammingDefaults(Boolean(template.defaultSets || template.defaultReps || template.defaultRestSeconds || template.tempo || template.notes || template.featured));
    setShowForm(true);
  }

  async function refresh() {
    setRefreshing(true);
    await templatesQuery.refetch();
    setRefreshing(false);
  }

  function submit() {
    if (!canSubmit) return;
    saveTemplate.mutate(
      {
        ...(editing && !editing.readOnly ? { templateId: editing.id } : {}),
        body: {
          scope: "ORG",
          name: name.trim(),
          muscleGroup: muscleGroup.trim() || null,
          equipment: equipment.trim() || null,
          defaultSets: Number.parseInt(sets, 10) || null,
          defaultReps: Number.parseInt(reps, 10) || null,
          defaultRestSeconds: Number.parseInt(restSeconds, 10) || null,
          tempo: tempo.trim() || null,
          notes: notes.trim() || null,
          featured,
        },
      },
      { onSuccess: () => resetForm() },
    );
  }

  function adoptStarter(template: ExerciseTemplateRecord) {
    saveTemplate.mutate({
      body: {
        scope: "ORG",
        starterId: template.id,
        name: template.name,
        featured: template.featured,
      },
    });
  }

  function confirmDelete(template: ExerciseTemplateRecord) {
    Alert.alert(t("owner.exerciseLibrary.removeTemplateTitle"), t("owner.exerciseLibrary.removeTemplateBody", { name: template.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("owner.exerciseLibrary.remove"), style: "destructive", onPress: () => deleteTemplate.mutate(template.id) },
    ]);
  }

  function renderTemplate(template: ExerciseTemplateRecord) {
    const isStarter = template.scope === "STARTER";
    const primaryAction = isStarter ? () => adoptStarter(template) : () => startEdit(template);
    const primaryLabel = isStarter ? t("owner.exerciseLibrary.add") : t("owner.exerciseLibrary.edit");

    return (
      <Card key={template.id} variant="compact" contentStyle={styles.templateCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
          onPress={primaryAction}
          style={({ pressed }) => [styles.templateMain, pressed ? styles.pressedRow : null]}
        >
          <IconBubble icon={template.featured ? "star" : "barbell"} tone={template.featured ? "amber" : "lime"} size={42} />
          <View style={styles.templateCopy}>
            <Text style={[styles.templateName, { color: palette.text.primary }]} numberOfLines={1}>{template.name}</Text>
            <Text style={[styles.templateMeta, { color: palette.text.secondary }]} numberOfLines={2}>
              {templateMeta(template, t)}
            </Text>
            <View style={styles.templateStatusRow}>
              <Pill tone={template.scope === "STARTER" ? "blue" : template.featured ? "amber" : "neutral"}>
                {templatePillLabel(template, t)}
              </Pill>
            </View>
          </View>
        </Pressable>
        <View style={styles.actions}>
          {isStarter ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("owner.exerciseLibrary.add")}
              hitSlop={10}
              onPress={() => adoptStarter(template)}
              style={({ pressed }) => [styles.addAction, pressed ? styles.pressedAction : null]}
            >
              <Ionicons name="add" size={20} color={palette.accent.base} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("owner.exerciseLibrary.remove")}
              hitSlop={10}
              onPress={() => confirmDelete(template)}
              style={({ pressed }) => [styles.removeAction, pressed ? styles.pressedAction : null]}
            >
              <Ionicons name="trash-outline" size={18} color={palette.feedback.danger} />
            </Pressable>
          )}
        </View>
      </Card>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="owner-exercise-library-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader
            title={t("owner.exerciseLibrary.title")}
            contextSlot={
              <View style={styles.headerContext}>
                <RoleSwitcherContextPill />
                <BranchSelectorChip style={styles.headerBranchSelector} />
              </View>
            }
            trailing={<HeaderActions showBell />}
          />
          <View style={styles.listToolbar}>
            <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
              {t("owner.exerciseLibrary.sharedLibrary")}
            </Text>
            <View style={styles.headerActions}>
              <Pill tone={orgTemplates.length ? "lime" : "neutral"}>{orgTemplates.length}</Pill>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showForm && !editing ? t("common.cancel") : t("owner.exerciseLibrary.new")}
                hitSlop={8}
                onPress={() => (showForm && !editing ? resetForm() : (resetForm(), setShowForm(true)))}
                style={({ pressed }) => [
                  styles.toolbarAction,
                  {
                    backgroundColor: showForm && !editing ? palette.surface.default : palette.accent.base,
                    borderColor: showForm && !editing ? palette.border.default : palette.accent.strong,
                  },
                  pressed ? styles.pressedAction : null,
                ]}
              >
                <Ionicons
                  name={showForm && !editing ? "close" : "add"}
                  size={20}
                  color={showForm && !editing ? palette.text.secondary : palette.text.onAccent}
                />
              </Pressable>
            </View>
          </View>
          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{editing ? t("owner.exerciseLibrary.editTemplate") : t("owner.exerciseLibrary.newTemplate")}</Text>
              <FormField label={t("owner.exerciseLibrary.exerciseName")} value={name} onChangeText={setName} placeholder={t("owner.exerciseLibrary.exerciseNamePlaceholder")} />
              <View style={styles.formRow}>
                <FormField label={t("owner.exerciseLibrary.muscle")} value={muscleGroup} onChangeText={setMuscleGroup} placeholder={t("owner.exerciseLibrary.musclePlaceholder")} style={styles.formField} />
                <FormField label={t("owner.exerciseLibrary.equipment")} value={equipment} onChangeText={setEquipment} placeholder={t("owner.exerciseLibrary.equipmentPlaceholder")} style={styles.formField} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showProgrammingDefaults }}
                onPress={() => setShowProgrammingDefaults((value) => !value)}
                style={({ pressed }) => [
                  styles.disclosureRow,
                  { borderColor: palette.border.default, backgroundColor: palette.surface.default },
                  pressed ? styles.pressedAction : null,
                ]}
              >
                <View style={styles.disclosureCopy}>
                  <Text style={[styles.disclosureTitle, { color: palette.text.primary }]}>
                    {t("owner.exerciseLibrary.programmingDefaults")}
                  </Text>
                  <Text style={[styles.disclosureMeta, { color: palette.text.secondary }]} numberOfLines={1}>
                    {programmingSummary}
                  </Text>
                </View>
                <Ionicons
                  name={showProgrammingDefaults ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={palette.text.secondary}
                />
              </Pressable>
              {showProgrammingDefaults ? (
                <View style={styles.defaultsStack}>
                  <View style={styles.formRow}>
                    <FormField label={t("owner.exerciseLibrary.sets")} value={sets} onChangeText={setSets} keyboardType="number-pad" style={styles.formField} />
                    <FormField label={t("owner.exerciseLibrary.reps")} value={reps} onChangeText={setReps} keyboardType="number-pad" style={styles.formField} />
                  </View>
                  <FormField label={t("owner.exerciseLibrary.restSec")} value={restSeconds} onChangeText={setRestSeconds} keyboardType="number-pad" />
                  <FormField label={t("owner.exerciseLibrary.tempo")} value={tempo} onChangeText={setTempo} placeholder="2-0-1" />
                  <FormField label={t("owner.exerciseLibrary.notes")} value={notes} onChangeText={setNotes} placeholder={t("owner.exerciseLibrary.notesPlaceholder")} multiline />
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.exerciseLibrary.featured")}</Text>
                    <ThemedSwitch value={featured} onValueChange={setFeatured} />
                  </View>
                </View>
              ) : null}
              <ZookButton onPress={submit} disabled={!canSubmit} busy={saveTemplate.isPending} busyLabel={t("common.saving")} icon="save-outline">
                {t("owner.exerciseLibrary.saveTemplate")}
              </ZookButton>
            </Card>
          ) : null}
          {templatesQuery.isError ? <QueryErrorState error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} /> : null}
          {templatesQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stack}>
              {[0, 1, 2, 3, 4].map((item) => (
                <View key={item} style={styles.templateMain}>
                  <Skeleton width={42} height={42} borderRadius={21} />
                  <View style={styles.templateCopy}>
                    <Skeleton width="70%" height={16} borderRadius={8} />
                    <Skeleton width="52%" height={12} borderRadius={6} />
                  </View>
                  <Skeleton width={58} height={26} borderRadius={13} />
                </View>
              ))}
            </Card>
          ) : null}
          {!templatesQuery.isLoading && !orgTemplates.length ? (
            <Card variant="compact">
              <EmptyState
                icon="barbell-outline"
                title={t("owner.exerciseLibrary.noSharedTemplates")}
                body={t("owner.exerciseLibrary.noSharedTemplatesBody")}
                cta={{
                  label: t("owner.exerciseLibrary.newTemplate"),
                  onPress: () => setShowForm(true),
                }}
              />
            </Card>
          ) : null}
          {!templatesQuery.isLoading ? <View style={styles.stack}>{orgTemplates.map(renderTemplate)}</View> : null}
          <SectionHeader title={t("owner.exerciseLibrary.starters")} action={<Pill tone={starters.length ? "blue" : "neutral"}>{starters.length}</Pill>} />
          {!templatesQuery.isLoading ? <View style={styles.stack}>{starters.map(renderTemplate)}</View> : null}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  headerContext: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minWidth: 0,
    width: "100%",
  },
  headerBranchSelector: {
    flex: 1,
    minWidth: 0,
  },
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: layout.screenContentTopPadding, width: "100%" },
  formCard: { gap: spacing.md },
  formTitle: { ...typography.cardTitle },
  sectionTitle: { ...typography.sectionTitle },
  headerActions: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  listToolbar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  toolbarAction: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
  disclosureRow: {
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disclosureCopy: { flex: 1, gap: 2, minWidth: 0 },
  disclosureTitle: { ...typography.bodyStrong },
  disclosureMeta: { ...typography.small },
  defaultsStack: { gap: spacing.sm },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  switchTitle: { ...typography.bodyStrong },
  stack: { gap: spacing.sm },
  templateCard: { gap: spacing.sm },
  templateMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  templateCopy: { flex: 1, gap: 2, minWidth: 0 },
  templateName: { ...typography.cardTitle },
  templateMeta: { ...typography.small },
  templateStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingTop: 2,
  },
  actions: { alignItems: "flex-end" },
  addAction: {
    alignItems: "center",
    borderColor: "rgba(170, 255, 83, 0.42)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  removeAction: {
    alignItems: "center",
    borderColor: "rgba(255, 98, 74, 0.42)",
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  pressedAction: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  pressedRow: { opacity: 0.78 },
});
