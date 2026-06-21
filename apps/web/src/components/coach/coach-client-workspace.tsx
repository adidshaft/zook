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
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <WorkspaceCard title="Trainer note" icon={FileText}>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {initialNote || "No private coaching note yet."}
          </p>
        </div>
        <AppHandoffCard
          compact
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
          compact
          title="Log progress in the app"
          description="Measurements, progress photos, and PT follow-up notes are captured in the trainer mobile workspace."
          deepLink={`${clientDeepLink}/sessions`}
        />
      </WorkspaceCard>

      <WorkspaceCard title="Workout draft" icon={Dumbbell}>
        <AppHandoffCard
          compact
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
                      {formatEnumLabel(plan.type)} · {formatEnumLabel(plan.status)} · {formatDateTime(plan.assignedAt)}
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
                        {formatEnumLabel(workout.workoutType)} · {formatDateTime(workout.startedAt)}
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
  );
}
