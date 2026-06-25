import { HomeCardShell, StreakChip } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function RestDayCard({ planName, streak }: { planName: string; streak: number }) {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-rest"
      icon="moon-outline"
      title={t("member.home.restDay")}
      body={t("member.home.restDayBody", { plan: planName })}
      ctaHref="/scan"
      ctaLabel={t("member.home.scanIntoGym")}
      tone="neutral"
    >
      <StreakChip value={streak} />
    </HomeCardShell>
  );
}
