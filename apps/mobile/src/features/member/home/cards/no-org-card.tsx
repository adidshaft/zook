import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function NoOrgCard() {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-no-org"
      icon="business-outline"
      title={t("member.home.joinGym")}
      body={t("member.home.joinGymBody")}
      ctaHref="/gyms"
      ctaLabel={t("member.home.findYourGym")}
      tone="neutral"
    />
  );
}
