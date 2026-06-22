import { HomeCardShell, StreakChip } from "./card-shell";

export default function LoggedCard({
  nextPlanName,
  streak,
}: {
  nextPlanName?: string;
  streak: number;
}) {
  return (
    <HomeCardShell
      testID="home-state-logged"
      icon="checkmark-done-outline"
      title="Workout logged"
      body={nextPlanName ? `Tomorrow: ${nextPlanName}.` : "Nice work. No next workout scheduled."}
      ctaHref="/plan"
      ctaLabel="View plan"
      tone="lime"
    >
      <StreakChip value={streak} />
    </HomeCardShell>
  );
}
