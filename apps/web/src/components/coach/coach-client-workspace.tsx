"use client";

import { useMemo, useState } from "react";
import { Activity, ClipboardList, Dumbbell, FileText, Ruler } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButton } from "@/components/zook-button";
import { webApiFetch } from "@/lib/api-client";
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

function parseNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  orgId,
  trainerId,
  clientId,
  clientName,
  initialNote,
  bodyProgress,
  activePlans,
  recentFeedback,
  recentWorkouts,
}: {
  orgId: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  initialNote: string;
  bodyProgress: BodyProgress[];
  activePlans: ActivePlan[];
  recentFeedback: RecentFeedback[];
  recentWorkouts: RecentWorkout[];
}) {
  const [note, setNote] = useState(initialNote);
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [measurementBusy, setMeasurementBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [measurementNote, setMeasurementNote] = useState("");
  const [planTitle, setPlanTitle] = useState(`E2E trainer draft for ${clientName}`);
  const [exerciseName, setExerciseName] = useState("Goblet squat");
  const [planDescription, setPlanDescription] = useState("Draft created from the trainer web client workspace.");

  const trainerPath = `/api/orgs/${orgId}/trainers/${trainerId}/clients/${clientId}`;
  const latestProgress = bodyProgress[0];
  const progressSummary = useMemo(() => {
    if (!latestProgress) return "No measurements yet";
    return [
      latestProgress.weightKg ? `${latestProgress.weightKg} kg` : null,
      latestProgress.waistCm ? `${latestProgress.waistCm} cm waist` : null,
      latestProgress.bodyFatPercent ? `${latestProgress.bodyFatPercent}% fat` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [latestProgress]);

  async function saveNote() {
    setNoteBusy(true);
    setNoteSaved(false);
    try {
      await webApiFetch(`${trainerPath}/note`, {
        method: "PATCH",
        body: { note },
        feedback: { success: "Trainer note saved." },
      });
      setNoteSaved(true);
      setNotice("Trainer note saved");
    } finally {
      setNoteBusy(false);
    }
  }

  async function logMeasurement() {
    setMeasurementBusy(true);
    try {
      await webApiFetch(`${trainerPath}/body-progress`, {
        method: "POST",
        body: {
          measuredAt: new Date().toISOString(),
          weightKg: parseNumber(weightKg),
          waistCm: parseNumber(waistCm),
          bodyFatPercent: parseNumber(bodyFatPercent),
          notes: measurementNote || undefined,
          visibility: "TRAINER_VISIBLE",
        },
        feedback: { success: "Progress measurement recorded." },
      });
      setNotice("Measurement recorded. Reload to see it in the timeline.");
      setWeightKg("");
      setWaistCm("");
      setBodyFatPercent("");
      setMeasurementNote("");
    } finally {
      setMeasurementBusy(false);
    }
  }

  async function createDraftPlan() {
    setPlanBusy(true);
    try {
      await webApiFetch(`/api/orgs/${orgId}/plans`, {
        method: "POST",
        body: {
          title: planTitle,
          type: "WORKOUT",
          description: planDescription,
          visibility: "selected",
          content: {
            blocks: [
              {
                type: "exercise",
                name: exerciseName,
                sets: 3,
                reps: "10",
                notes: "Trainer draft. Review before assigning.",
              },
            ],
          },
        },
        feedback: { success: "Workout draft created." },
      });
      setNotice("Workout draft created in the coaching library.");
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <WorkspaceCard
        title="Trainer note"
        icon={FileText}
        action={notice ? <Pill tone="lime">{notice}</Pill> : null}
      >
        <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
          Private coaching note
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setNoteSaved(false);
            }}
            rows={6}
            className="zook-focus rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            placeholder="Add technique cues, preferences, limitations, or next-session focus."
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ZookButton type="button" state={noteBusy ? "loading" : noteSaved ? "success" : "idle"} onClick={() => void saveNote()}>
            Save note
          </ZookButton>
          <p className="text-xs text-[var(--text-tertiary)]">Visible to the assigned trainer and gym team.</p>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Progress snapshot" icon={Ruler}>
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-4">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{progressSummary}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {latestProgress ? `Measured ${formatDateTime(latestProgress.measuredAt)}` : "Log a measurement to start the timeline."}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            inputMode="decimal"
            placeholder="Weight kg"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
          <input
            value={waistCm}
            onChange={(event) => setWaistCm(event.target.value)}
            inputMode="decimal"
            placeholder="Waist cm"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
          <input
            value={bodyFatPercent}
            onChange={(event) => setBodyFatPercent(event.target.value)}
            inputMode="decimal"
            placeholder="Body fat %"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
        </div>
        <input
          value={measurementNote}
          onChange={(event) => setMeasurementNote(event.target.value)}
          placeholder="Measurement note"
          className="zook-focus mt-3 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
        />
        <div className="mt-4">
          <ZookButton type="button" state={measurementBusy ? "loading" : "idle"} onClick={() => void logMeasurement()}>
            Log measurement
          </ZookButton>
        </div>
      </WorkspaceCard>

      <WorkspaceCard title="Workout draft" icon={Dumbbell}>
        <div className="grid gap-3">
          <input
            value={planTitle}
            onChange={(event) => setPlanTitle(event.target.value)}
            placeholder="Plan title"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
          <input
            value={exerciseName}
            onChange={(event) => setExerciseName(event.target.value)}
            placeholder="First exercise"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
          <input
            value={planDescription}
            onChange={(event) => setPlanDescription(event.target.value)}
            placeholder="Description"
            className="zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ZookButton type="button" state={planBusy ? "loading" : "idle"} onClick={() => void createDraftPlan()}>
            Create draft workout
          </ZookButton>
          <p className="text-xs text-[var(--text-tertiary)]">Draft only. It will not notify the member until assigned.</p>
        </div>
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
                <p className="text-sm text-[var(--text-secondary)]">No trainer-visible feedback yet.</p>
              )}
            </div>
          </section>
        </div>
      </WorkspaceCard>
    </div>
  );
}
