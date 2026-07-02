"use client";

import { GlassCard, Pill } from "@/components/glass-card";
import { formatDateTime } from "@/lib/format";
import type { ClassRow } from "@/components/dashboard/types";

type ClassesOverviewCardProps = {
  nextClass: ClassRow | undefined;
  scheduleBlockedReason: string;
  scheduledCount: number;
  selectedBranchName: string;
  startingSoonCount: number;
  totalOpenSeats: number;
  trainerCount: number;
  t: (key: string, replacements?: Record<string, string | number>) => string;
};

export function ClassesOverviewCard({
  nextClass,
  scheduleBlockedReason,
  scheduledCount,
  selectedBranchName,
  startingSoonCount,
  totalOpenSeats,
  trainerCount,
  t,
}: ClassesOverviewCardProps) {
  return (
    <GlassCard variant={scheduleBlockedReason ? "warning" : "strong"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t("operationsEyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
            {scheduleBlockedReason
              ? t("finishSetupTitle")
              : nextClass
                ? t("nextUp", { name: nextClass.name })
                : t("buildFirstClass")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            {scheduleBlockedReason ||
              (nextClass
                ? t("nextClassDescription", {
                    time: formatDateTime(nextClass.startTime),
                    trainer: nextClass.trainerName ?? t("trainerPending"),
                  })
                : t("buildFirstClassDescription"))}
          </p>
        </div>
        <Pill tone={scheduleBlockedReason ? "amber" : nextClass ? "blue" : "neutral"}>
          {selectedBranchName}
        </Pill>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Pill tone={scheduledCount ? "blue" : "neutral"}>
          {t("scheduledCount", { count: scheduledCount })}
        </Pill>
        <Pill tone={totalOpenSeats ? "neutral" : "amber"}>
          {t("openSeatsCount", { count: totalOpenSeats })}
        </Pill>
        <Pill tone={startingSoonCount ? "amber" : "neutral"}>
          {t("soonCount", { count: startingSoonCount })}
        </Pill>
        <Pill tone={trainerCount ? "neutral" : "amber"}>
          {t("trainersCount", { count: trainerCount })}
        </Pill>
      </div>
    </GlassCard>
  );
}
