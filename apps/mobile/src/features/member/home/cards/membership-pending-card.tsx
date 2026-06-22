import { HomeCardShell } from "./card-shell";

export default function MembershipPendingCard({ gymName }: { gymName: string }) {
  return (
    <HomeCardShell
      testID="home-state-membership-pending"
      icon="time-outline"
      title="Membership pending activation"
      body={`Your payment is linked to ${gymName}. The front desk still needs to activate your membership before check-ins and plans unlock.`}
      ctaHref="/membership"
      ctaLabel="Open Membership"
      tone="amber"
    />
  );
}
