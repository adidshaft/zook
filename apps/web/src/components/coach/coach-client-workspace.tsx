"use client";

import { useMemo } from "react";
import { Activity, ClipboardList, Dumbbell, FileText, Ruler } from "lucide-react";
import { AppHandoffCard } from "@/components/app-handoff-card";
import { GlassCard } from "@/components/glass-card";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

type BodyProgress = {
  id: string;
  measuredAt: string;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPercent: number | null;
  notes: string | null;
};

type ActivePlan = {
  id: string;
  assignedAt: string;
  title: string;
  type: string;
  status: string;
};

type RecentFeedback = {
  id: string;
  updatedAt: string;
  completionPct: number;
  feedback: string | null;
};

type RecentWorkout = {
  id: string;
  title: string;
  workoutType: string;
  startedAt: string;
  durationMinutes: number | null;
  notes: string | null;
};

function coachPlanTypeLabel(type: string | null | undefined) {
  if (type === "WORKOUT") return "Workout";
  if (type === "NUTRITION") return "Nutrition";
  if (type === "ADVISORY") return "Advisory";
  if (type === "HYBRID") return "Hybrid";
  return formatEnumLabel(type ?? "plan");
}

function coachPlanStatusLabel(status: string | null | undefined) {
  if (status === "ACTIVE") return "Active";
  if (status === "ASSIGNED") return "Assigned";
  if (status === "DRAFT") return "Draft";
  if (status === "COMPLETED") return "Completed";
  if (status === "ARCHIVED") return "Archived";
  return formatEnumLabel(status ?? "plan");
}

function workoutTypeLabel(type: string | null | undefined) {
  if (type === "STRENGTH") return "Strength";
  if (type === "CARDIO") return "Cardio";
  if (type === "MOBILITY") return "Mobility";
  if (type === "YOGA") return "Yoga";
  if (type === "HIIT") return "HIIT";
  return formatEnumLabel(type ?? "workout");
}

function WorkspaceCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Activity;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--accent)]">
            <Icon size={18} />
          </span>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </GlassCard>
  );
}

export function CoachClientWorkspace({
  clientId,
  initialNote,
  bodyProgress,
  activePlans,
  recentFeedback,
  recentWorkouts,
}: {
  clientId: string;
  initialNote: string;
  bodyProgress: BodyProgress[];
  activePlans: ActivePlan[];
  recentFeedback: RecentFeedback[];
  recentWorkouts: RecentWorkout[];
}) {
  const latestProgress = bodyProgress[0];
  const clientDeepLink = `zook://trainer/clients/${encodeURIComponent(clientId)}`;
  const latestFeedback = recentFeedback[0];
  const latestWorkout = recentWorkouts[0];
  const coachingAction = !activePlans.length
    ? {
        title: "Assign the first plan",
        detail: "This client has no active workout plan. Start with a simple weekly plan before the next session.",
        status: "Needs plan",
      }
    : !latestProgress
      ? {
          title: "Log a baseline check",
          detail: "Add weight, waist, or progress photos so future coaching has a measurable reference.",
          status: "Needs baseline",
        }
      : latestFeedback && latestFeedback.completionPct < 60
        ? {
            title: "Review low completion",
            detail: `${latestFeedback.completionPct}% completion on the latest plan feedback. Adjust volume or follow up in chat.`,
            status: "Review",
          }
        : {
            title: "Keep momentum",
            detail: latestWorkout
              ? `Latest trainer-visible workout: ${latestWorkout.title}. Use the app for the next coaching note.`
              : "Plan and progress are ready. Use the app to capture the next session note.",
            status: "On track",
          };
  const progressSummary = useMemo(() => {
    if (!latestProgress) return "No measurements";
    return [
      latestProgress.weightKg ? `${latestProgress.weightKg} kg` : null,
      latestProgress.waistCm ? `${latestProgress.waistCm} cm waist` : null,
      latestProgress.bodyFatPercent ? `${latestProgress.bodyFatPercent}% fat` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [latestProgress]);

  return (
    <div className="grid gap-5">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Coaching focus
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
              {coachingAction.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {coachingAction.detail}
            </p>
          </div>
          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {coachingAction.status}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Active plans", value: activePlans.length, detail: "Assigned now" },
            {
              label: "Progress logs",
              value: bodyProgress.length,
              detail: latestProgress ? formatDateTime(latestProgress.measuredAt) : "No baseline",
            },
            {
              label: "Feedback",
              value: recentFeedback.length,
              detail: latestFeedback ? `${latestFeedback.completionPct}% latest` : "No updates",
            },
            {
              label: "Workouts",
              value: recentWorkouts.length,
              detail: latestWorkout ? formatDateTime(latestWorkout.startedAt) : "No recent workout",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3"
            >
              <p className="text-xs text-[var(--text-tertiary)]">{item.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--text-primary)]">
                {item.value}
              </p>
              <p className="mt-1 truncate text-xs text-[var(--text-tertiary)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <WorkspaceCard title="Trainer note" icon={FileText}>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {initialNote || "No private coaching note yet."}
          </p>
        </div>
        <AppHandoffCard
          minimal
          title="Edit trainer notes in the app"
          description="Technique cues, preferences, limitations, and next-session focus stay in the trainer app flow."
          deepLink={clientDeepLink}
        />
      </WorkspaceCard>

      <WorkspaceCard title="Progress check" icon={Ruler}>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{progressSummary}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {latestProgress ? `Measured ${formatDateTime(latestProgress.measuredAt)}` : "Log a measurement to start the timeline."}
          </p>
        </div>
        <AppHandoffCard
          minimal
          title="Log progress in the app"
          description="Measurements, progress photos, and PT follow-up notes are captured in the trainer mobile workspace."
          deepLink={`${clientDeepLink}/sessions`}
        />
      </WorkspaceCard>

      <WorkspaceCard title="Workout draft" icon={Dumbbell}>
        <AppHandoffCard
          minimal
          title="Create or assign plans in the app"
          description="Workout drafting, exercise edits, and assigning plans are deeper coaching actions handled in Zook mobile."
          deepLink={`${clientDeepLink}/plan`}
        />
      </WorkspaceCard>

      <WorkspaceCard title="Client activity" icon={ClipboardList}>
        <div className="grid gap-4">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Active plans
            </h3>
            <div className="mt-2 grid gap-2">
              {activePlans.length ? (
                activePlans.map((plan) => (
                  <div key={plan.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{plan.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {coachPlanTypeLabel(plan.type)} · {coachPlanStatusLabel(plan.status)} · {formatDateTime(plan.assignedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No active assigned plans.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Feedback and workouts
            </h3>
            <div className="mt-2 grid gap-2">
              {[...recentFeedback, ...recentWorkouts].length ? (
                <>
                  {recentFeedback.map((entry) => (
                    <div key={`feedback-${entry.id}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.completionPct}% complete</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.feedback || "Progress updated"} · {formatDateTime(entry.updatedAt)}</p>
                    </div>
                  ))}
                  {recentWorkouts.map((workout) => (
                    <div key={`workout-${workout.id}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{workout.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {workoutTypeLabel(workout.workoutType)} · {formatDateTime(workout.startedAt)}
                        {workout.durationMinutes ? ` · ${workout.durationMinutes} min` : ""}
                      </p>
                      {workout.notes ? <p className="mt-2 text-xs text-[var(--text-tertiary)]">{workout.notes}</p> : null}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-[var(--text-secondary)]">No trainer-visible feedback.</p>
              )}
            </div>
          </section>
        </div>
      </WorkspaceCard>
      </div>
    </div>
  );
}
