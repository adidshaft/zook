import { HomeCardShell } from "./card-shell";

export default function ExpiredCard() {
  return (
    <HomeCardShell
      testID="home-state-expired"
      icon="alert-circle-outline"
      title="Your membership expired"
      body="Renew your membership to keep check-ins and plan access moving."
      ctaHref="/membership"
      ctaLabel="View membership"
      tone="amber"
    />
  );
}
