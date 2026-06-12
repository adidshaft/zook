import { HomeCardShell } from "./card-shell";

export default function NoOrgCard() {
  return (
    <HomeCardShell
      testID="home-state-no-org"
      icon="business-outline"
      title="Join a gym"
      body="Find your gym to unlock membership, plans, check-ins, and trainer updates."
      ctaHref="/gyms"
      ctaLabel="Find your gym"
      tone="blue"
    />
  );
}
