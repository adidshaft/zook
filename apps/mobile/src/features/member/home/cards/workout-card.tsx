import { HomeCardShell } from "./card-shell";
import { usePlanExercises } from "@/lib/domains/plans";

export default function WorkoutCard({
  assignmentId,
  estimatedMinutes,
  planName,
}: {
  assignmentId: string;
  estimatedMinutes?: number;
  planName: string;
}) {
  const exercisesQuery = usePlanExercises(assignmentId);
  const exerciseNames =
    exercisesQuery.data?.exercises
      ?.map((exercise) => exercise.name)
      .filter(Boolean)
      .slice(0, 3) ?? [];
  const exerciseCopy = exerciseNames.length ? ` • ${exerciseNames.join(", ")}` : "";

  return (
    <HomeCardShell
      testID="home-state-workout"
      icon="barbell-outline"
      title={`Today: ${planName}`}
      body={
        estimatedMinutes
          ? `${estimatedMinutes} minutes estimated.${exerciseCopy}`
          : exerciseNames.length
            ? `Your trainer has ${exerciseNames.join(", ")} ready today.`
            : "Your trainer has a workout ready for today."
      }
      ctaHref={`/plan/${assignmentId}`}
      ctaLabel="Start workout"
      tone="blue"
    />
  );
}
