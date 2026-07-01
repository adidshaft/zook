"use client";

import { CheckCircle2, Clock, PackageCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function DeskMetric({
  label,
  value,
  icon: Icon,
  urgent = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  urgent?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${
          urgent
            ? "border-amber-200/25 bg-amber-200/10 text-amber-100"
            : "border-white/10 bg-white/8 text-white/62"
        }`}
      >
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-white/45">{label}</span>
        <span className="mt-0.5 block text-lg font-semibold tabular-nums text-white">{value}</span>
      </span>
    </div>
  );
}

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
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <DeskMetric
        label="Today's check-ins"
        value={todayCount}
        icon={CheckCircle2}
      />
      <DeskMetric
        label="Pending review"
        value={pendingCount}
        icon={Clock}
        urgent={pendingCount > 0}
      />
      <DeskMetric
        label="Member directory"
        value={memberCount}
        icon={Users}
      />
      <DeskMetric
        label="Pickup queue"
        value={handoffCount}
        icon={PackageCheck}
        urgent={handoffCount > 0}
      />
    </section>
  );
}
