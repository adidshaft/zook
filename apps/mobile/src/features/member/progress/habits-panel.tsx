import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card, IconBubble, SectionHeader } from "@/components/primitives";
import type { PillTone } from "@/components/primitives";
import {
  useCreateHabit,
  useLogHabit,
  useMyHabits,
  type CreateHabitInput,
} from "@/lib/domains";
import type { HabitCategory, HabitRecord } from "@/lib/domains/shared/types";
import { useT, type TranslationKey } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

type CategoryVisual = { icon: keyof typeof Ionicons.glyphMap; tone: PillTone };

const CATEGORY_VISUAL: Record<string, CategoryVisual> = {
  HYDRATION: { icon: "water-outline", tone: "blue" },
  SLEEP: { icon: "moon-outline", tone: "violet" },
  STEPS: { icon: "walk-outline", tone: "lime" },
  PROTEIN: { icon: "nutrition-outline", tone: "amber" },
  STRETCHING: { icon: "body-outline", tone: "violet" },
  CUSTOM: { icon: "checkmark-circle-outline", tone: "neutral" },
};

const PRESETS: Array<{ labelKey: TranslationKey; titleKey: TranslationKey } & Omit<CreateHabitInput, "title">> = [
  { labelKey: "member.habits.waterLabel", titleKey: "member.habits.waterTitle", category: "HYDRATION", targetValue: 3, unit: "L" },
  { labelKey: "member.habits.sleepLabel", titleKey: "member.habits.sleepTitle", category: "SLEEP", targetValue: 8, unit: "hrs" },
  { labelKey: "member.habits.stepsLabel", titleKey: "member.habits.stepsTitle", category: "STEPS", targetValue: 10000, unit: "steps" },
  { labelKey: "member.habits.proteinLabel", titleKey: "member.habits.proteinTitle", category: "PROTEIN" },
  { labelKey: "member.habits.stretchLabel", titleKey: "member.habits.stretchTitle", category: "STRETCHING", targetValue: 10, unit: "min" },
];

function visualFor(category: string): CategoryVisual {
  return CATEGORY_VISUAL[category] ?? CATEGORY_VISUAL.CUSTOM;
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function doneToday(habit: HabitRecord) {
  return (habit.logs ?? []).some(
    (log) => log.completed && log.loggedAt && isSameDay(new Date(log.loggedAt), new Date()),
  );
}

/** Consecutive days ending today/yesterday with a completed log. */
function streakFor(habit: HabitRecord) {
  const days = new Set(
    (habit.logs ?? [])
      .filter((log) => log.completed && log.loggedAt)
      .map((log) => new Date(log.loggedAt as string).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function HabitRow({
  habit,
  busy,
  onToggle,
}: {
  habit: HabitRecord;
  busy: boolean;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  const t = useT();
  const visual = visualFor(habit.category);
  const done = doneToday(habit);
  const streak = streakFor(habit);
  const meta =
    streak > 0
      ? done
        ? t("member.habits.dayStreak", { count: streak })
        : t("member.habits.dayStreakDoToday", { count: streak })
      : done
        ? t("member.habits.doneToday")
        : habit.targetValue
          ? t("member.habits.target", { value: habit.targetValue, unit: habit.unit ? ` ${habit.unit}` : "" })
          : t("member.habits.tapToCompleteToday");

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, busy }}
      accessibilityLabel={
        done
          ? t("member.habits.completedTodayAccessibility", { title: habit.title })
          : t("member.habits.notDoneAccessibility", { title: habit.title })
      }
      onPress={onToggle}
      disabled={busy}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <IconBubble icon={visual.icon} tone={visual.tone} size={38} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: palette.text.primary }]} numberOfLines={1}>
          {habit.title}
        </Text>
        <Text style={[styles.rowMeta, { color: palette.text.secondary }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View
        style={[
          styles.check,
          done
            ? { backgroundColor: palette.accent.base, borderColor: palette.accent.base }
            : { borderColor: palette.border.strong },
        ]}
      >
        {done ? <Ionicons name="checkmark" size={18} color={palette.text.onAccent} /> : null}
      </View>
    </Pressable>
  );
}

export function HabitsPanel() {
  const { palette } = useTheme();
  const t = useT();
  const habitsQuery = useMyHabits();
  const createHabit = useCreateHabit();
  const logHabit = useLogHabit();
  const [showAdd, setShowAdd] = useState(false);
  const habits = habitsQuery.data?.habits ?? [];
  const existingTitles = new Set(habits.map((habit) => habit.title));

  return (
    <View>
      <SectionHeader
        title={t("member.habits.dailyHabits")}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showAdd ? t("member.habits.closeAddHabit") : t("member.habits.addHabit")}
            hitSlop={8}
            onPress={() => setShowAdd((current) => !current)}
            style={({ pressed }) => [styles.addToggle, pressed ? styles.rowPressed : null]}
          >
            <Ionicons
              name={showAdd ? "close" : "add"}
              size={16}
              color={palette.accent.base}
            />
            <Text style={[styles.addToggleText, { color: palette.accent.base }]}>
              {showAdd ? t("member.habits.done") : t("member.habits.add")}
            </Text>
          </Pressable>
        }
      />
      <Card variant="compact" contentStyle={styles.card}>
        {showAdd ? (
          <View style={styles.presets}>
            {PRESETS.map((preset) => {
              const presetTitle = t(preset.titleKey);
              const already = existingTitles.has(presetTitle);
              return (
                <Pressable
                  key={preset.titleKey}
                  accessibilityRole="button"
                  accessibilityLabel={t("member.habits.addHabitAccessibility", { title: presetTitle })}
                  disabled={already || createHabit.isPending}
                  onPress={() =>
                    createHabit.mutate({
                      title: presetTitle,
                      category: preset.category as HabitCategory,
                      ...(preset.targetValue !== undefined
                        ? { targetValue: preset.targetValue }
                        : {}),
                      ...(preset.unit ? { unit: preset.unit } : {}),
                    })
                  }
                  style={({ pressed }) => [
                    styles.presetChip,
                    {
                      borderColor: already ? palette.border.subtle : palette.accent.soft,
                      backgroundColor: already
                        ? palette.surface.default
                        : palette.surface.accentSoft,
                    },
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <Ionicons
                    name={already ? "checkmark" : visualFor(preset.category).icon}
                    size={14}
                    color={already ? palette.text.tertiary : palette.accent.base}
                  />
                  <Text
                    style={[
                      styles.presetText,
                      { color: already ? palette.text.tertiary : palette.accent.base },
                    ]}
                  >
                    {t(preset.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {habits.length === 0 && !showAdd ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowAdd(true)}
            style={styles.empty}
          >
            <IconBubble icon="sparkles-outline" tone="lime" size={40} />
            <Text style={[styles.emptyText, { color: palette.text.secondary }]}>
              {t("member.habits.emptyBody")}
            </Text>
            <Text style={[styles.emptyCta, { color: palette.accent.base }]}>{t("member.habits.addFirstHabit")}</Text>
          </Pressable>
        ) : null}

        {habits.map((habit, index) => (
          <View key={habit.id}>
            {index > 0 ? (
              <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
            ) : null}
            <HabitRow
              habit={habit}
              busy={logHabit.isPending && logHabit.variables?.habitId === habit.id}
              onToggle={() =>
                logHabit.mutate({ habitId: habit.id, completed: !doneToday(habit) })
              }
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    paddingVertical: 4,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.cardTitle,
  },
  rowMeta: {
    ...typography.small,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  addToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  addToggleText: {
    ...typography.small,
    fontFamily: "Inter_600SemiBold",
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  presetChip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetText: {
    ...typography.caption,
  },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: {
    ...typography.small,
    textAlign: "center",
    maxWidth: 280,
  },
  emptyCta: {
    ...typography.caption,
  },
});
