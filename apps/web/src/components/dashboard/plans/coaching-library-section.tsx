import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import type { PlansSectionProps } from "./types";

type CoachingLibrarySectionProps = Pick<PlansSectionProps, "coachPlans" | "coachPlansState">;

export function CoachingLibrarySection({
  coachPlans,
  coachPlansState,
}: CoachingLibrarySectionProps) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Coaching Library"
        title="Workout and advisory plans"
        description="These are the plans trainers are creating and reviewing for members."
        badge={
          <Pill tone="amber">
            {coachPlans.filter((plan) => plan.reviewed === false).length} pending review
          </Pill>
        }
      />
      <ManagedOn surface="trainer-mobile" className="mt-4">
        Plans are created and published by trainers in the Trainer app.
      </ManagedOn>
      <div className="mt-5">
        {coachPlansState.error ? (
          <ErrorNotice message={coachPlansState.error} />
        ) : coachPlansState.loading && coachPlans.length === 0 ? (
          <EmptyState
            title="Loading coaching library"
            description="Pulling draft and published plan content."
          />
        ) : (
          <DataTable
            columns={[
              {
                id: "title",
                header: "Plan",
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/45">{formatEnumLabel(plan.type)}</p>
                  </div>
                ),
              },
              {
                id: "review",
                header: "Review",
                render: (plan) => (
                  <div className="flex flex-wrap gap-2">
                    <StatusPill
                      value={plan.reviewed ? "Reviewed" : "Needs review"}
                      tone={plan.reviewed ? "lime" : "amber"}
                    />
                    {plan.aiGenerated ? <StatusPill value="Assisted" /> : null}
                  </div>
                ),
              },
              {
                id: "assignment",
                header: "Assignments",
                align: "right",
                render: (plan) => plan.assignmentCount.toString(),
              },
              {
                id: "updated",
                header: "Updated",
                render: (plan) => formatDateTime(plan.updatedAt),
              },
            ]}
            rows={coachPlans}
            rowKey={(plan) => plan.id}
            empty="No workout or advisory plans are available yet."
          />
        )}
      </div>
    </GlassCard>
  );
}
