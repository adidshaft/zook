import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function FirstRunCard({ gymUsername }: { gymUsername?: string }) {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-first-run"
      icon="compass-outline"
      title={t("member.home.firstRunTitle")}
      body={t("member.home.firstRunBody")}
      ctaHref={gymUsername ? `/gyms/${gymUsername}` : "/gyms"}
      ctaLabel={t("member.home.findYourGym")}
      tone="neutral"
    />
  );
}
