import { HomeCardShell } from "./card-shell";

export default function InProgressCard({ assignmentId }: { assignmentId: string }) {
  return (
    <HomeCardShell
      testID="home-state-in-progress"
      icon="play-circle-outline"
      title="Workout in progress"
      body="Resume the session you already started and finish logging your work."
      ctaHref={`/plan/${assignmentId}`}
      ctaLabel="Resume"
      tone="blue"
    />
  );
}
