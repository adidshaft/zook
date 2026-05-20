import { HomeCardShell } from "./card-shell";

export default function WorkoutCard({
  assignmentId,
  estimatedMinutes,
  planName,
}: {
  assignmentId: string;
  estimatedMinutes?: number;
  planName: string;
}) {
  return (
    <HomeCardShell
      testID="home-state-workout"
      icon="barbell-outline"
      title={`Today: ${planName}`}
      body={estimatedMinutes ? `${estimatedMinutes} minutes estimated.` : "Your trainer has a workout ready for today."}
      ctaHref={`/plan/${assignmentId}`}
      ctaLabel="Start workout"
      tone="lime"
    />
  );
}
