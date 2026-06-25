import { HomeCardShell } from "./card-shell";
import { useT } from "@/lib/i18n";

export default function InProgressCard({ assignmentId }: { assignmentId: string }) {
  const t = useT();
  return (
    <HomeCardShell
      testID="home-state-in-progress"
      icon="play-circle-outline"
      title={t("member.home.workoutInProgress")}
      body={t("member.home.finishLoggingWork")}
      ctaHref={`/plan/${assignmentId}`}
      ctaLabel={t("member.home.resume")}
      tone="blue"
    />
  );
}
