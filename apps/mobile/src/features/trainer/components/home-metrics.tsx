import { View } from "react-native";
import { MetricTile } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/query-hooks";

export function HomeMetrics({ clients }: { clients: TrainerClientRecord[] }) {
  const clientsWithPlans = clients.filter((client) => (client.summary?.activePlans ?? 0) > 0).length;
  const clientsNeedingPlans = Math.max(clients.length - clientsWithPlans, 0);

  return (
    <View testID="trainer-view-home" style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <MetricTile label="Clients" value={String(clients.length)} detail="Ready for coaching" tone="blue" />
      <MetricTile label="Active plans" value={String(clientsWithPlans)} detail="With active plans" tone="amber" />
      <MetricTile label="Needs plan" value={String(clientsNeedingPlans)} detail="Create Plan next" tone="lime" />
    </View>
  );
}
