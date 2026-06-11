import { useRouter } from "expo-router";
import { GlassCard, IconBubble, ListRow, StatusChip, ZookButton } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/domains";
import { fitnessGoalFor } from "../helpers";

export function PlanRow({ client }: { client: TrainerClientRecord }) {
  const router = useRouter();
  const activePlans = client.summary?.activePlans ?? 0;

  return (
    <GlassCard variant="compact" contentStyle={{ gap: 12 }}>
      <ListRow
        title={client.user?.name ?? "Client"}
        subtitle={`${activePlans} active ${activePlans === 1 ? "plan" : "plans"} · ${fitnessGoalFor(client)}`}
        leading={<IconBubble icon="reader-outline" tone="amber" />}
        trailing={<StatusChip status="Open" tone="amber" />}
      />
      <ZookButton
        testID={`trainer-client-detail-${client.memberUserId}`}
        onPress={() => router.push(`/trainer/clients/${client.memberUserId}/plan` as never)}
        variant="secondary"
        icon="reader-outline"
      >
        Client Detail
      </ZookButton>
    </GlassCard>
  );
}
