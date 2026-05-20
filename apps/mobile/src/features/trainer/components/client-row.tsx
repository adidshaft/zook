import { Link } from "expo-router";
import { Pressable } from "react-native";
import { IconBubble, ListRow, StatusChip } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/query-hooks";
import { fitnessGoalFor, planCountLabel } from "../helpers";

export function ClientRow({ client, index }: { client: TrainerClientRecord; index: number }) {
  const activePlanCount = client.summary?.activePlans ?? 0;

  return (
    <Link href={`/trainer/clients/${client.memberUserId}` as never} asChild>
      <Pressable
        testID={index === 0 ? "trainer-client-row-first" : `trainer-client-row-${client.memberUserId}`}
        accessibilityRole="button"
      >
        <ListRow
          title={client.user?.name ?? "Client"}
          subtitle={`${fitnessGoalFor(client)} · ${planCountLabel(activePlanCount)}`}
          leading={<IconBubble icon="person-outline" tone="lime" />}
          trailing={<StatusChip status={client.active ? "Active" : "Paused"} tone="lime" />}
        />
      </Pressable>
    </Link>
  );
}
