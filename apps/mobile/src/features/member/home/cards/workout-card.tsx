import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/primitives/linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { usePlanExercises } from "@/lib/domains/plans";
import { useT } from "@/lib/i18n";
import { glow, gradients, radii, spacing, typography, useTheme } from "@/lib/theme";

// The hero gradient is always dark in both themes, so its text must stay light
// regardless of light/dark mode (otherwise light mode renders dark-on-dark).
const ON_DARK_PRIMARY = "#F6FFE9";
const ON_DARK_SECONDARY = "rgba(246,255,233,0.72)";
const ON_DARK_CHIP_BG = "rgba(255,255,255,0.10)";
const ON_DARK_CHIP_BORDER = "rgba(255,255,255,0.20)";

export default function WorkoutCard({
  assignmentId,
  estimatedMinutes,
  planName,
}: {
  assignmentId: string;
  estimatedMinutes?: number;
  planName: string;
}) {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const exercisesQuery = usePlanExercises(assignmentId);
  const exercises = exercisesQuery.data?.exercises ?? [];
  const firstExercise = exercises.find((exercise) => Boolean(exercise.name))?.name;
  const exerciseCount = exercises.length;
  const meta = [
    exerciseCount
      ? t(exerciseCount === 1 ? "member.home.exerciseCountOne" : "member.home.exerciseCountOther", {
          count: exerciseCount,
        })
      : null,
    estimatedMinutes ? t("member.home.estimatedMinutes", { minutes: estimatedMinutes }) : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const openWorkout = () => router.push(`/plan/${assignmentId}` as never);

  return (
    <Pressable
      testID="home-state-workout"
      onPress={openWorkout}
      accessibilityRole="button"
      accessibilityLabel={`${t("member.home.startWorkout")}: ${planName}`}
      style={({ pressed }) => [
        styles.card,
        glow.soft,
        { borderColor: palette.border.subtle },
        pressed ? styles.cardPressed : null,
      ]}
    >
      <LinearGradient
        colors={gradients.heroCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={gradients.heroCardAccent}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Ionicons
        name="barbell"
        size={96}
        color={palette.accent.base}
        style={styles.decor}
      />
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: palette.accent.base }]}>{t("member.home.todaysWorkout")}</Text>
          <Text numberOfLines={2} style={[styles.title, { color: ON_DARK_PRIMARY }]}>{planName}</Text>
          {meta ? (
            <Text numberOfLines={1} style={[styles.meta, { color: ON_DARK_SECONDARY }]}>{meta}</Text>
          ) : null}
          {firstExercise ? (
            <Text numberOfLines={1} style={[styles.preview, { color: ON_DARK_SECONDARY }]}>
              {firstExercise}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.startControl,
            { borderColor: ON_DARK_CHIP_BORDER, backgroundColor: ON_DARK_CHIP_BG },
          ]}
        >
          <Ionicons name="play" size={17} color={ON_DARK_PRIMARY} />
          <View style={styles.startCopy}>
            <Text numberOfLines={1} style={[styles.startText, { color: ON_DARK_PRIMARY }]}>
              {t("member.home.startWorkout")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={ON_DARK_SECONDARY} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  decor: {
    position: "absolute",
    right: -20,
    top: -18,
    opacity: 0.08,
    transform: [{ rotate: "-18deg" }],
  },
  content: {
    padding: 12,
    gap: 10,
  },
  copy: {
    gap: 4,
    paddingRight: 70,
  },
  eyebrow: {
    ...typography.eyebrow,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    lineHeight: 31,
  },
  meta: {
    ...typography.small,
  },
  preview: {
    ...typography.caption,
    fontFamily: "Inter_600SemiBold",
  },
  startControl: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  startCopy: {
    flex: 1,
    minWidth: 0,
  },
  startText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
});
