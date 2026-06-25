import { useRouter } from "expo-router";
import { Card, ListRow, ZookButton } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { fitnessGoalFor } from "../helpers";

export function PlanRow({ client }: { client: TrainerClientRecord }) {
  const router = useRouter();
  const t = useT();
  const activePlans = client.summary?.activePlans ?? 0;
  const planLabel = activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans");
  const fitnessGoal = fitnessGoalFor(client, t("trainer.clients.generalFitness"));

  return (
    <Card variant="compact" contentStyle={{ gap: 12 }}>
      <ListRow
        title={client.user?.name ?? t("trainer.home.clientFallback")}
        subtitle={t("trainer.clients.activePlanCount", {
          count: activePlans,
          label: planLabel,
        }) + ` · ${fitnessGoal}`}
      />
      <ZookButton
        testID={`trainer-client-detail-${client.memberUserId}`}
        onPress={() => router.push(`/trainer/clients/${client.memberUserId}/plan` as never)}
        variant="secondary"
        icon="reader-outline"
      >
        {t("trainer.plans.clientDetail")}
      </ZookButton>
    </Card>
  );
}
