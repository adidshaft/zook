import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ZookButton } from "@/components/primitives";
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
  const exerciseNames = exercises
    .map((exercise) => exercise.name)
    .filter(Boolean)
    .slice(0, 3);
  const exerciseCount = exercises.length;
  const meta = [
    exerciseCount ? t("member.home.exerciseCount", { count: exerciseCount }) : null,
    estimatedMinutes ? t("member.home.estimatedMinutes", { minutes: estimatedMinutes }) : null,
    t("member.home.trainerAssigned"),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View testID="home-state-workout" style={[styles.card, glow.soft, { borderColor: palette.border.subtle }]}>
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
        size={150}
        color={palette.accent.base}
        style={styles.decor}
      />
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: palette.accent.base }]}>{t("member.home.todaysWorkout")}</Text>
        <Text style={[styles.title, { color: ON_DARK_PRIMARY }]}>{planName}</Text>
        <Text style={[styles.meta, { color: ON_DARK_SECONDARY }]}>{meta}</Text>
        {exerciseNames.length ? (
          <View style={styles.chips}>
            {exerciseNames.map((name) => (
              <View
                key={name}
                style={[
                  styles.chip,
                  { borderColor: ON_DARK_CHIP_BORDER, backgroundColor: ON_DARK_CHIP_BG },
                ]}
              >
                <Text style={[styles.chipText, { color: ON_DARK_PRIMARY }]} numberOfLines={1}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <ZookButton
          onPress={() => router.push(`/plan/${assignmentId}` as never)}
          icon="play"
          size="lg"
          fullWidth
          style={styles.cta}
        >
          {t("member.home.startWorkout")}
        </ZookButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
  },
  decor: {
    position: "absolute",
    right: -28,
    top: -22,
    opacity: 0.08,
    transform: [{ rotate: "-18deg" }],
  },
  content: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.heroTitle,
  },
  meta: {
    ...typography.small,
    marginTop: 2,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  chipText: {
    ...typography.caption,
    fontFamily: "Inter_500Medium",
  },
  cta: {
    marginTop: spacing.md,
  },
});
