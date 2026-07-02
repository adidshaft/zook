import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ScreenHeader,
  Card,
  FormField,
  IconBubble,
  QueryErrorState,
  SectionHeader,
  Skeleton,
  ZookButton,
  ZookScreen,
  useConfirmSheet,
} from "@/components/primitives";
import { useClientDietPlans, useCreateClientDietPlan } from "@/lib/domains/trainer/queries";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type MealRow = { name: string; calories: string };

const defaultMealKeys: Array<{ key: TranslationKey; calories: string }> = [
  { key: "trainer.clientDiet.breakfast", calories: "420" },
  { key: "trainer.clientDiet.midMorning", calories: "240" },
  { key: "trainer.clientDiet.lunch", calories: "560" },
  { key: "trainer.clientDiet.preWorkout", calories: "320" },
  { key: "trainer.clientDiet.dinner", calories: "480" },
];

export default function TrainerClientDiet() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { confirm, sheet } = useConfirmSheet();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const clientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const createPlan = useCreateClientDietPlan(clientId ?? "");
  const priorPlansQuery = useClientDietPlans(clientId);
  const previousPlan = priorPlansQuery.data?.plans?.[0];
  const prefilledRef = useRef(false);

  const [title, setTitle] = useState(t("trainer.clientDiet.defaultTitle"));
  const [target, setTarget] = useState("2000");
  const [showPreviousMeals, setShowPreviousMeals] = useState(false);
  const [meals, setMeals] = useState<MealRow[]>(
    defaultMealKeys.map((meal) => ({ name: t(meal.key), calories: meal.calories })),
  );

  useEffect(() => {
    if (prefilledRef.current || !previousPlan) return;
    prefilledRef.current = true;
    setTitle(previousPlan.title ?? t("trainer.clientDiet.defaultTitle"));
    if (previousPlan.calorieTarget) setTarget(String(previousPlan.calorieTarget));
    if (previousPlan.meals?.length) {
      setMeals(
        previousPlan.meals.map((meal) => ({
          name: meal.name,
          calories: meal.calories != null ? String(meal.calories) : "",
        })),
      );
    }
  }, [previousPlan, t]);

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
    confirm({
      title: t("trainer.clientDiet.publishTitle"),
      body: t("trainer.clientDiet.publishBody"),
      destructiveLabel: t("trainer.clientDiet.publish"),
      cancelLabel: t("common.cancel"),
      onConfirm: () =>
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
    });
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
          <ScreenHeader title={t("trainer.clientDiet.title")} showBack />

          <SectionHeader title={t("trainer.clientDiet.previousPlan")} />
          {priorPlansQuery.isLoading ? (
            <Card variant="compact" contentStyle={styles.stack}>
              <Skeleton height={18} width="50%" />
              <Skeleton height={44} />
            </Card>
          ) : null}
          {priorPlansQuery.isError ? (
            <Card variant="compact">
              <QueryErrorState error={priorPlansQuery.error} onRetry={() => void priorPlansQuery.refetch()} />
            </Card>
          ) : null}
          {!priorPlansQuery.isLoading && !priorPlansQuery.isError ? (
            previousPlan ? (
              <Card variant="compact" contentStyle={styles.stack}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showPreviousMeals }}
                  onPress={() => setShowPreviousMeals((current) => !current)}
                  style={({ pressed }) => [styles.previousPlanHeader, pressed ? styles.pressed : null]}
                >
                  <IconBubble icon="restaurant-outline" tone="lime" size={36} />
                  <View style={styles.previousPlanCopy}>
                    <Text style={[styles.cardTitle, { color: palette.text.primary }]} numberOfLines={1}>{previousPlan.title}</Text>
                    <Text style={[styles.totalText, { color: palette.text.secondary }]} numberOfLines={1}>
                      {previousPlan.calorieTarget ? t("trainer.clientDiet.kcalTargetPrefix", { kcal: previousPlan.calorieTarget }) : ""}
                      {t("trainer.clientDiet.mealCount", { count: previousPlan.meals?.length ?? 0 })}
                    </Text>
                  </View>
                  <Ionicons name={showPreviousMeals ? "chevron-up" : "chevron-down"} size={18} color={palette.text.tertiary} />
                </Pressable>
                {showPreviousMeals ? (
                  previousPlan.meals?.map((meal) => (
                    <View key={meal.id} style={styles.previousMealRow}>
                      <Text style={[styles.previousMealName, { color: palette.text.primary }]} numberOfLines={1}>
                        {meal.name}
                      </Text>
                      <Text style={[styles.previousMealKcal, { color: palette.text.secondary }]}>
                        {meal.calories != null ? t("trainer.clientDiet.kcal", { kcal: meal.calories }) : "-"}
                      </Text>
                    </View>
                  ))
                ) : null}
              </Card>
            ) : (
              <Card variant="compact" contentStyle={styles.stack}>
                <Text style={[styles.totalText, { color: palette.text.secondary }]}>
                  {t("trainer.clientDiet.noPreviousPlan")}
                </Text>
              </Card>
            )
          ) : null}

          <Card contentStyle={styles.formCard}>
            <FormField label={t("trainer.clientDiet.planTitle")} value={title} onChangeText={setTitle} placeholder={t("trainer.clientDiet.planTitlePlaceholder")} />
            <FormField label={t("trainer.clientDiet.dailyCalorieTarget")} value={target} onChangeText={setTarget} keyboardType="number-pad" placeholder="2000" />
            <View style={[styles.totalRow, { borderColor: palette.border.subtle }]}>
              <IconBubble icon="restaurant-outline" tone="lime" size={36} />
              <Text style={[styles.totalText, { color: palette.text.secondary }]}>
                {t("trainer.clientDiet.mealsPlanned", { count: meals.length, kcal: mealsTotal })}
              </Text>
            </View>
          </Card>

          <SectionHeader
            title={t("trainer.clientDiet.meals")}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("trainer.clientDiet.addMeal")}
                hitSlop={8}
                onPress={addMeal}
                style={({ pressed }) => [
                  styles.headerIconAction,
                  { backgroundColor: palette.surface.default, borderColor: palette.border.default },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons name="add" size={20} color={palette.text.secondary} />
              </Pressable>
            }
          />

          <View style={styles.stack}>
            {meals.map((meal, index) => (
              <Card key={index} variant="compact" contentStyle={styles.mealRow}>
                <FormField
                  label={t("trainer.clientDiet.mealLabel", { index: index + 1 })}
                  value={meal.name}
                  onChangeText={(value) => updateMeal(index, { name: value })}
                  placeholder={t("trainer.clientDiet.breakfast")}
                  style={styles.mealName}
                />
                <FormField
                  label={t("trainer.clientDiet.kcalLabel")}
                  value={meal.calories}
                  onChangeText={(value) => updateMeal(index, { calories: value })}
                  keyboardType="number-pad"
                  placeholder="400"
                  style={styles.mealKcal}
                />
              </Card>
            ))}
          </View>

          <ZookButton onPress={publish} disabled={!canPublish} busy={createPlan.isPending} busyLabel={t("trainer.clientDiet.publishing")} icon="send-outline" size="lg">
            {t("trainer.clientDiet.publish")}
          </ZookButton>
        </ScrollView>
      </ZookScreen>
      {sheet}
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
  headerIconAction: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  mealRow: { gap: spacing.sm },
  mealName: { width: "100%" },
  mealKcal: { width: "100%" },
  cardTitle: { ...typography.cardTitle },
  previousPlanHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  previousPlanCopy: { flex: 1, gap: 2, minWidth: 0 },
  previousMealRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  previousMealName: { ...typography.body, flex: 1, marginRight: spacing.sm },
  previousMealKcal: { ...typography.caption },
});
