import { ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/use-t";
import type { PlansSectionProps } from "./types";

type CoachingLibrarySectionProps = Pick<PlansSectionProps, "coachPlans" | "coachPlansState">;

type PlansT = ReturnType<typeof useT>;

function coachingPlanTypeLabel(type: string | null | undefined, t: PlansT) {
  if (type === "WORKOUT") return t("coachWorkout");
  if (type === "NUTRITION") return t("coachNutrition");
  if (type === "ADVISORY") return t("coachAdvisory");
  if (type === "HYBRID") return t("coachHybrid");
  return type || t("coachFallback");
}

export function CoachingLibrarySection({
  coachPlans,
  coachPlansState,
}: CoachingLibrarySectionProps) {
  const t = useT("plans");
  const pendingReviewCount = coachPlans.filter((plan) => plan.reviewed === false).length;

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("coachingLibrary")}
        title={t("workoutAdvisoryPlans")}
        badge={
          <Pill tone={pendingReviewCount > 0 ? "amber" : "neutral"}>
            {t("pendingReviewCount", { count: pendingReviewCount })}
          </Pill>
        }
      />
      <ManagedOn surface="trainer-mobile" className="mt-4">
        {t("trainerPlansManaged")}
      </ManagedOn>
      <div className="mt-5">
        {coachPlansState.error ? (
          <ErrorNotice message={coachPlansState.error} />
        ) : coachPlansState.loading && coachPlans.length === 0 ? (
          <EmptyState title={t("loadingCoachingLibrary")} />
        ) : (
          <DataTable
            columns={[
              {
                id: "title",
                header: t("plan"),
                render: (plan) => (
                  <div>
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {coachingPlanTypeLabel(plan.type, t)}
                    </p>
                  </div>
                ),
              },
              {
                id: "review",
                header: t("review"),
                render: (plan) => (
                  <div className="flex items-center gap-2">
                    <span
                      aria-label={plan.reviewed ? t("reviewed") : t("needsReview")}
                      title={plan.reviewed ? t("reviewed") : t("needsReview")}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${
                        plan.reviewed
                          ? "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]"
                          : "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]"
                      }`}
                    >
                      <span aria-hidden>{plan.reviewed ? "✓" : "!"}</span>
                    </span>
                    {plan.aiGenerated ? (
                      <p className="text-xs text-white/45">{t("aiAssistedDraft")}</p>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "assignment",
                header: t("assignments"),
                align: "right",
                render: (plan) => plan.assignmentCount.toString(),
              },
              {
                id: "updated",
                header: t("updated"),
                render: (plan) => formatDateTime(plan.updatedAt),
              },
            ]}
            rows={coachPlans}
            rowKey={(plan) => plan.id}
            empty={t("noCoachingPlans")}
          />
        )}
      </div>
    </GlassCard>
  );
}
