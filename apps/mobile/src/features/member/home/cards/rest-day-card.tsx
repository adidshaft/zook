import { HomeCardShell, StreakChip } from "./card-shell";

export default function RestDayCard({ planName, streak }: { planName: string; streak: number }) {
  return (
    <HomeCardShell
      testID="home-state-rest"
      icon="moon-outline"
      title="Rest day"
      body={`${planName} has no workout scheduled today. Recover well and keep the routine warm.`}
      ctaHref="/scan"
      ctaLabel="Scan into gym"
      tone="blue"
    >
      <StreakChip value={streak} />
    </HomeCardShell>
  );
}
