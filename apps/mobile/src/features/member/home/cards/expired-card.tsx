import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function ExpiredCard() {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-expired"
      icon="alert-circle-outline"
      title={t("member.home.expiredTitle")}
      body={t("member.home.expiredBody")}
      ctaHref="/membership"
      ctaLabel={t("member.home.viewMembership")}
      tone="amber"
    />
  );
}
