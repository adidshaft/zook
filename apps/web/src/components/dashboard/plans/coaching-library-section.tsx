import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { formatDateTime } from "@/lib/format";
import type { PlansSectionProps } from "./types";

type CoachingLibrarySectionProps = Pick<PlansSectionProps, "coachPlans" | "coachPlansState">;

function coachingPlanTypeLabel(type: string | null | undefined) {
  if (type === "WORKOUT") return "Workout";
  if (type === "NUTRITION") return "Nutrition";
  if (type === "ADVISORY") return "Advisory";
  if (type === "HYBRID") return "Hybrid";
  return type || "Coaching";
}

export function CoachingLibrarySection({
  coachPlans,
  coachPlansState,
}: CoachingLibrarySectionProps) {
  const pendingReviewCount = coachPlans.filter((plan) => plan.reviewed === false).length;

  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Coaching Library"
        title="Workout and advisory plans"
        badge={
          <Pill tone={pendingReviewCount > 0 ? "amber" : "neutral"}>
            {pendingReviewCount} pending review
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
          <EmptyState title="Loading coaching library" />
        ) : (
          <DataTable
            columns={[
              {
                id: "title",
                header: "Plan",
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {coachingPlanTypeLabel(plan.type)}
                    </p>
                  </div>
                ),
              },
              {
                id: "review",
                header: "Review",
                render: (plan) => (
                  <div className="flex items-center gap-2">
                    <span
                      aria-label={plan.reviewed ? "Reviewed" : "Needs review"}
                      title={plan.reviewed ? "Reviewed" : "Needs review"}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${
                        plan.reviewed
                          ? "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]"
                          : "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                      }`}
                    >
                      <span aria-hidden>{plan.reviewed ? "✓" : "!"}</span>
                    </span>
                    {plan.aiGenerated ? (
                      <p className="text-xs text-white/45">AI assisted draft</p>
                    ) : null}
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
            empty="No coaching plans."
          />
        )}
      </div>
    </GlassCard>
  );
}
