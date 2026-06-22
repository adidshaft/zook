import { useRouter } from "expo-router";
import { Card, ListRow, ZookButton } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/domains";
import { fitnessGoalFor } from "../helpers";

export function PlanRow({ client }: { client: TrainerClientRecord }) {
  const router = useRouter();
  const activePlans = client.summary?.activePlans ?? 0;

  return (
    <Card variant="compact" contentStyle={{ gap: 12 }}>
      <ListRow
        title={client.user?.name ?? "Client"}
        subtitle={`${activePlans} active ${activePlans === 1 ? "plan" : "plans"} · ${fitnessGoalFor(client)}`}
      />
      <ZookButton
        testID={`trainer-client-detail-${client.memberUserId}`}
        onPress={() => router.push(`/trainer/clients/${client.memberUserId}/plan` as never)}
        variant="secondary"
        icon="reader-outline"
      >
        Client Detail
      </ZookButton>
    </Card>
  );
}
