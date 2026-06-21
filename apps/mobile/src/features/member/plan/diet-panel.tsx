import { indianMealPresets } from "@zook/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  FormField,
  Card,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookButton,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { dietApi } from "@/lib/domain-api";
import { queryKeys } from "@/lib/domains/shared/keys";
import { useMyDiet } from "@/lib/domains/tracking/queries";
import { spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export function DietPanel() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { palette } = useTheme();
  const dietQuery = useMyDiet();
  const plan = dietQuery.data?.plan ?? null;
  const logs = dietQuery.data?.logs ?? [];
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatsG, setFatsG] = useState("");
  const [saving, setSaving] = useState(false);
  const loggedCalories = logs.reduce((total, log) => total + (log.calories ?? 0), 0);
  const mealNameTrimmed = mealName.trim();
  const macroValues = [calories, proteinG, carbsG, fatsG].map((value) => Number.parseInt(value, 10) || 0);
  const hasAnyMacro = macroValues.some((value) => value > 0);
  const validationMessage = !mealNameTrimmed
    ? "Add a meal name before logging."
    : !hasAnyMacro
      ? "Add calories or at least one macro before logging."
      : "";

  function applyPreset(preset: (typeof indianMealPresets)[number]) {
    setMealName(preset.label);
    setCalories(String(preset.calories));
    setProteinG(String(preset.proteinG));
    setCarbsG(String(preset.carbsG));
    setFatsG(String(preset.fatsG));
  }

  async function saveMeal() {
    if (!token || saving) return;
    if (!mealNameTrimmed || !hasAnyMacro) return;
    setSaving(true);
    try {
      await dietApi.logMeal({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          ...(plan?.id ? { dietPlanId: plan.id } : {}),
          mealName: mealNameTrimmed,
          calories: Number.parseInt(calories, 10) || undefined,
          proteinG: Number.parseInt(proteinG, 10) || undefined,
          carbsG: Number.parseInt(carbsG, 10) || undefined,
          fatsG: Number.parseInt(fatsG, 10) || undefined,
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.member.diet() });
      setMealName("");
      setCalories("");
      setProteinG("");
      setCarbsG("");
      setFatsG("");
      showToast({ tone: "success", haptic: "success", message: "Meal logged." });
    } catch (error) {
      showToast({
        title: "Could not log meal",
        message: getApiErrorMessage(error),
        tone: "danger",
        haptic: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.stack}>
      {dietQuery.isError ? (
        <QueryErrorState error={dietQuery.error} onRetry={() => void dietQuery.refetch()} />
      ) : null}

      <Card variant="compact" contentStyle={styles.stack}>
        <View style={styles.rollupRow}>
          <View>
            <Text style={[styles.rollupLabel, { color: palette.text.secondary }]}>Today</Text>
            <Text style={[styles.rollupValue, { color: palette.text.primary }]}>
              {loggedCalories} / {plan?.calorieTarget ?? "-"} kcal
            </Text>
          </View>
          <StatusChip status={plan ? "Active plan" : "No plan"} tone={plan ? "blue" : "neutral"} />
        </View>
        {plan?.calorieTarget ? (
          <ProgressBar
            value={loggedCalories / plan.calorieTarget}
            tone={loggedCalories > plan.calorieTarget ? "amber" : "lime"}
            label={`${Math.max(0, plan.calorieTarget - loggedCalories)} kcal remaining today`}
          />
        ) : null}
        {plan?.meals?.length ? (
          plan.meals.map((meal) => (
            <View key={meal.id} style={[styles.mealRow, { borderTopColor: palette.border.subtle }]}>
              <Text style={[styles.mealTitle, { color: palette.text.primary }]}>{meal.name}</Text>
              <Text style={[styles.mealMeta, { color: palette.text.secondary }]}>
                {meal.calories ?? 0} kcal · {meal.proteinG ?? 0}P/{meal.carbsG ?? 0}C/{meal.fatsG ?? 0}F
              </Text>
            </View>
          ))
        ) : (
          <EmptyState icon="restaurant-outline" title="No diet plan" body="Your trainer will publish your meal plan here." />
        )}
      </Card>

      <Card contentStyle={styles.stack}>
        <SectionHeader title="Log meal" />
        <View style={styles.presetRow}>
          {indianMealPresets.slice(0, 5).map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              onPress={() => applyPreset(preset)}
              style={[
                styles.presetChip,
                {
                  borderColor: palette.border.subtle,
                  backgroundColor: palette.surface.default,
                },
              ]}
            >
              <Text style={[styles.presetText, { color: palette.text.primary }]}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>
        <FormField testID="meal-log-name" label="Meal" value={mealName} onChangeText={setMealName} placeholder="Paneer sandwich" />
        <FormField testID="meal-log-calories" label="Calories" value={calories} onChangeText={setCalories} keyboardType="number-pad" placeholder="320" />
        <View style={styles.macroRow}>
          <FormField label="Protein" value={proteinG} onChangeText={setProteinG} keyboardType="number-pad" placeholder="20" style={styles.macroField} />
          <FormField label="Carbs" value={carbsG} onChangeText={setCarbsG} keyboardType="number-pad" placeholder="35" style={styles.macroField} />
          <FormField label="Fats" value={fatsG} onChangeText={setFatsG} keyboardType="number-pad" placeholder="8" style={styles.macroField} />
        </View>
        {validationMessage ? (
          <Text accessibilityRole="alert" style={[styles.validationText, { color: palette.feedback.danger }]}>
            {validationMessage}
          </Text>
        ) : null}
        <ZookButton testID="meal-log-save" onPress={() => void saveMeal()} busy={saving} busyLabel="Logging..." icon="restaurant-outline">
          Log meal
        </ZookButton>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  rollupRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rollupLabel: typography.caption,
  rollupValue: typography.cardTitle,
  mealRow: { borderTopWidth: 1, gap: 3, paddingTop: 10 },
  mealTitle: typography.bodyStrong,
  mealMeta: typography.caption,
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  presetChip: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  presetText: typography.caption,
  macroRow: { flexDirection: "row", gap: spacing.sm },
  macroField: { flex: 1 },
  validationText: typography.caption,
});
