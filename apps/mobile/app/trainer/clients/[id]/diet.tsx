import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Card,
  FormField,
  IconBubble,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useCreateClientDietPlan } from "@/lib/domains/trainer/queries";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type MealRow = { name: string; calories: string };

const DEFAULT_MEALS: MealRow[] = [
  { name: "Breakfast", calories: "420" },
  { name: "Mid-morning", calories: "240" },
  { name: "Lunch", calories: "560" },
  { name: "Pre-workout", calories: "320" },
  { name: "Dinner", calories: "480" },
];

export default function TrainerClientDiet() {
  const { palette } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const createPlan = useCreateClientDietPlan(clientId ?? "");

  const [title, setTitle] = useState("Coached diet plan");
  const [target, setTarget] = useState("2000");
  const [meals, setMeals] = useState<MealRow[]>(DEFAULT_MEALS);

  const mealsTotal = meals.reduce((total, meal) => total + (Number.parseInt(meal.calories, 10) || 0), 0);
  const validMeals = meals.filter((meal) => meal.name.trim().length >= 2);
  const canPublish = title.trim().length >= 2 && validMeals.length >= 1 && !createPlan.isPending;

  function updateMeal(index: number, patch: Partial<MealRow>) {
    setMeals((current) => current.map((meal, i) => (i === index ? { ...meal, ...patch } : meal)));
  }

  function addMeal() {
    setMeals((current) => [...current, { name: "", calories: "" }]);
  }

  function publish() {
    if (!canPublish) return;
    Alert.alert("Publish diet plan?", "The member sees this plan in their Diet tab immediately.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Publish",
        onPress: () =>
          createPlan.mutate(
            {
              title: title.trim(),
              ...(Number.parseInt(target, 10) ? { calorieTarget: Number.parseInt(target, 10) } : {}),
              meals: validMeals.map((meal) => ({
                name: meal.name.trim(),
                ...(Number.parseInt(meal.calories, 10)
                  ? { calories: Number.parseInt(meal.calories, 10) }
                  : {}),
              })),
            },
            { onSuccess: () => router.back() },
          ),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="trainer-client-diet-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AppHeader title="Diet plan" subtitle="Build and publish a plan for your client." showProfileShortcut={false} showBack />

          <Card contentStyle={styles.formCard}>
            <FormField label="Plan title" value={title} onChangeText={setTitle} placeholder="Muscle gain · Vegetarian" />
            <FormField label="Daily calorie target" value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="2000" />
            <View style={[styles.totalRow, { borderColor: palette.border.subtle }]}>
              <IconBubble icon="restaurant-outline" tone="lime" size={36} />
              <Text style={[styles.totalText, { color: palette.text.secondary }]}>
                {meals.length} meals · {mealsTotal} kcal planned
              </Text>
            </View>
          </Card>

          <SectionHeader
            title="Meals"
            action={
              <ZookButton size="sm" variant="secondary" icon="add" onPress={addMeal}>
                Add meal
              </ZookButton>
            }
          />

          <View style={styles.stack}>
            {meals.map((meal, index) => (
              <Card key={index} variant="compact" contentStyle={styles.mealRow}>
                <FormField
                  label={`Meal ${index + 1}`}
                  value={meal.name}
                  onChangeText={(value) => updateMeal(index, { name: value })}
                  placeholder="Breakfast"
                  style={styles.mealName}
                />
                <FormField
                  label="kcal"
                  value={meal.calories}
                  onChangeText={(value) => updateMeal(index, { calories: value })}
                  keyboardType="number-pad"
                  placeholder="400"
                  style={styles.mealKcal}
                />
              </Card>
            ))}
          </View>

          <ZookButton onPress={publish} disabled={!canPublish} busy={createPlan.isPending} busyLabel="Publishing..." icon="send-outline" size="lg">
            Publish to client
          </ZookButton>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  formCard: { gap: spacing.md },
  totalRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm,
  },
  totalText: { ...typography.small },
  stack: { gap: spacing.sm },
  mealRow: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm },
  mealName: { flex: 1 },
  mealKcal: { width: 96 },
});
