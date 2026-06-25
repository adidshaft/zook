import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function MembershipPendingCard({ gymName }: { gymName: string }) {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-membership-pending"
      icon="time-outline"
      title={t("member.home.membershipPendingTitle")}
      body={t("member.home.membershipPendingBody", { gym: gymName })}
      ctaHref="/membership"
      ctaLabel={t("member.home.openMembership")}
      tone="amber"
    />
  );
}
