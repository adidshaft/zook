import { HomeCardShell, StreakChip } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function LoggedCard({
  nextPlanName,
  streak,
}: {
  nextPlanName?: string;
  streak: number;
}) {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-logged"
      icon="checkmark-done-outline"
      title={t("member.home.workoutLogged")}
      body={nextPlanName ? t("member.home.tomorrowPlan", { name: nextPlanName }) : t("member.home.noNextWorkout")}
      ctaHref="/plan"
      ctaLabel={t("member.home.viewPlan")}
      tone="lime"
    >
      <StreakChip value={streak} />
    </HomeCardShell>
  );
}
