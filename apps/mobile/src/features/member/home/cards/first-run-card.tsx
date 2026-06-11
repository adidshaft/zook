import { HomeCardShell } from "./card-shell";

export default function FirstRunCard({ gymUsername }: { gymUsername?: string }) {
  return (
    <HomeCardShell
      testID="home-state-first-run"
      icon="sparkles-outline"
      title="Welcome to Zook"
      body="Your membership, workouts, and check-ins will settle here as your gym gets you set up."
      ctaHref={gymUsername ? `/gyms/${gymUsername}` : "/gyms"}
      ctaLabel="Find your gym"
      tone="blue"
    />
  );
}
