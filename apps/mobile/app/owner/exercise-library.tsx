import { Stack } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  EmptyState,
  FormField,
  IconBubble,
  Pill,
  QueryErrorState,
  SectionHeader,
  ThemedSwitch,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  useDeleteExerciseTemplate,
  useOrgExerciseTemplates,
  useSaveExerciseTemplate,
  type ExerciseTemplateRecord,
} from "@/lib/domains";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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

  const templates = templatesQuery.data?.templates ?? [];
  const starters = templates.filter((template) => template.scope === "STARTER");
  const orgTemplates = templates.filter((template) => template.scope === "ORG");
  const canSubmit = name.trim().length >= 2 && !saveTemplate.isPending;

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
    return (
      <Card key={template.id} variant="compact" contentStyle={styles.templateCard}>
        <View style={styles.templateMain}>
          <IconBubble icon={template.featured ? "star" : "barbell"} tone={template.featured ? "amber" : "lime"} size={42} />
          <View style={styles.templateCopy}>
            <Text style={[styles.templateName, { color: palette.text.primary }]} numberOfLines={1}>{template.name}</Text>
            <Text style={[styles.templateMeta, { color: palette.text.secondary }]} numberOfLines={1}>
              {templateMeta(template, t)}
            </Text>
          </View>
          <Pill tone={template.scope === "STARTER" ? "blue" : template.featured ? "amber" : "neutral"}>
            {templatePillLabel(template, t)}
          </Pill>
        </View>
        <View style={styles.actions}>
          {template.scope === "STARTER" ? (
            <ZookButton size="sm" variant="secondary" icon="add" onPress={() => adoptStarter(template)} style={styles.actionButton}>
              {t("owner.exerciseLibrary.add")}
            </ZookButton>
          ) : (
            <>
              <ZookButton size="sm" variant="secondary" icon="create-outline" onPress={() => startEdit(template)} style={styles.actionButton}>
                {t("owner.exerciseLibrary.edit")}
              </ZookButton>
              <ZookButton size="sm" variant="destructive" icon="trash-outline" onPress={() => confirmDelete(template)} style={styles.actionButton}>
                {t("owner.exerciseLibrary.remove")}
              </ZookButton>
            </>
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
          <AppHeader title={t("owner.exerciseLibrary.title")} subtitle={t("owner.exerciseLibrary.subtitle")} showBack />
          <SectionHeader
            title={t("owner.exerciseLibrary.sharedLibrary")}
            action={
              <ZookButton size="sm" variant={showForm && !editing ? "secondary" : "primary"} icon={showForm && !editing ? "close" : "add"} onPress={() => (showForm && !editing ? resetForm() : (resetForm(), setShowForm(true)))}>
                {showForm && !editing ? t("common.cancel") : t("owner.exerciseLibrary.new")}
              </ZookButton>
            }
          />
          {showForm ? (
            <Card contentStyle={styles.formCard}>
              <Text style={[styles.formTitle, { color: palette.text.primary }]}>{editing ? t("owner.exerciseLibrary.editTemplate") : t("owner.exerciseLibrary.newTemplate")}</Text>
              <FormField label={t("owner.exerciseLibrary.exerciseName")} value={name} onChangeText={setName} placeholder={t("owner.exerciseLibrary.exerciseNamePlaceholder")} />
              <View style={styles.formRow}>
                <FormField label={t("owner.exerciseLibrary.muscle")} value={muscleGroup} onChangeText={setMuscleGroup} placeholder={t("owner.exerciseLibrary.musclePlaceholder")} style={styles.formField} />
                <FormField label={t("owner.exerciseLibrary.equipment")} value={equipment} onChangeText={setEquipment} placeholder={t("owner.exerciseLibrary.equipmentPlaceholder")} style={styles.formField} />
              </View>
              <View style={styles.formRow}>
                <FormField label={t("owner.exerciseLibrary.sets")} value={sets} onChangeText={setSets} keyboardType="number-pad" style={styles.formField} />
                <FormField label={t("owner.exerciseLibrary.reps")} value={reps} onChangeText={setReps} keyboardType="number-pad" style={styles.formField} />
                <FormField label={t("owner.exerciseLibrary.restSec")} value={restSeconds} onChangeText={setRestSeconds} keyboardType="number-pad" style={styles.formField} />
              </View>
              <FormField label={t("owner.exerciseLibrary.tempo")} value={tempo} onChangeText={setTempo} placeholder="2-0-1" />
              <FormField label={t("owner.exerciseLibrary.notes")} value={notes} onChangeText={setNotes} placeholder={t("owner.exerciseLibrary.notesPlaceholder")} multiline />
              <View style={styles.switchRow}>
                <Text style={[styles.switchTitle, { color: palette.text.primary }]}>{t("owner.exerciseLibrary.featured")}</Text>
                <ThemedSwitch value={featured} onValueChange={setFeatured} />
              </View>
              <ZookButton onPress={submit} disabled={!canSubmit} busy={saveTemplate.isPending} busyLabel={t("common.saving")} icon="save-outline">
                {t("owner.exerciseLibrary.saveTemplate")}
              </ZookButton>
            </Card>
          ) : null}
          {templatesQuery.isError ? <QueryErrorState error={templatesQuery.error} onRetry={() => void templatesQuery.refetch()} /> : null}
          {!templatesQuery.isLoading && !orgTemplates.length ? (
            <Card variant="compact">
              <EmptyState icon="barbell-outline" title={t("owner.exerciseLibrary.noSharedTemplates")} body={t("owner.exerciseLibrary.noSharedTemplatesBody")} />
            </Card>
          ) : null}
          <View style={styles.stack}>{orgTemplates.map(renderTemplate)}</View>
          <SectionHeader title={t("owner.exerciseLibrary.starters")} />
          <View style={styles.stack}>{starters.map(renderTemplate)}</View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: layout.screenContentTopPadding, width: "100%" },
  formCard: { gap: spacing.md },
  formTitle: { ...typography.cardTitle },
  formRow: { flexDirection: "row", gap: spacing.sm },
  formField: { flex: 1 },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  switchTitle: { ...typography.bodyStrong },
  stack: { gap: spacing.sm },
  templateCard: { gap: spacing.sm },
  templateMain: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  templateCopy: { flex: 1, minWidth: 0 },
  templateName: { ...typography.cardTitle },
  templateMeta: { ...typography.small },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
});
