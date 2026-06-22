import { HomeCardShell } from "./card-shell";

export default function FirstRunCard({ gymUsername }: { gymUsername?: string }) {
  return (
    <HomeCardShell
      testID="home-state-first-run"
      icon="compass-outline"
      title="Welcome to Zook"
      body="Your membership, workouts, and check-ins collect here once your gym adds you."
      ctaHref={gymUsername ? `/gyms/${gymUsername}` : "/gyms"}
      ctaLabel="Find your gym"
      tone="neutral"
    />
  );
}
