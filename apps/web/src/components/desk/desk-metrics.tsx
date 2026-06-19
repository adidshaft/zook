"use client";

import { CheckCircle2, Clock, IndianRupee, Users } from "lucide-react";
import { KPITile } from "@/components/dashboard/charts";

export function DeskMetrics({
  todayCount,
  pendingCount,
  memberCount,
  handoffCount,
}: {
  todayCount: number;
  pendingCount: number;
  memberCount: number;
  handoffCount: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KPITile
        label="Today's check-ins"
        value={todayCount}
        icon={CheckCircle2}
        tone="sky"
      />
      <KPITile
        label="Pending review"
        value={pendingCount}
        icon={Clock}
        tone={pendingCount > 0 ? "amber" : "sky"}
        caption={pendingCount > 0 ? "Needs eyes" : "Clear"}
      />
      <KPITile
        label="Member directory"
        value={memberCount}
        icon={Users}
        tone="sky"
      />
      <KPITile
        label="Desk handoffs"
        value={handoffCount}
        icon={IndianRupee}
        tone="violet"
        caption={handoffCount > 0 ? "Awaiting pickup" : "All clear"}
      />
    </section>
  );
}
