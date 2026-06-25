import type { Ionicons } from "@expo/vector-icons";
import type { TrainerClientRecord } from "@/lib/domains";
import type { TranslationKey } from "@/lib/i18n";

export type PlanTemplateId = "workout" | "diet" | "routine" | "machine" | "recovery";

export const planTemplates: Array<{
  id: PlanTemplateId;
  label: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "workout",
    label: "Workout",
    title: "Workout focus",
    body: "Add exercises, sets, rest periods, and coaching cues before assignment.",
    icon: "barbell-outline",
  },
  {
    id: "diet",
    label: "Diet",
    title: "Nutrition focus",
    body: "Add meal timing, protein targets, hydration notes, and restriction-safe guidance.",
    icon: "nutrition-outline",
  },
  {
    id: "routine",
    label: "Routine",
    title: "Weekly routine",
    body: "Map training days, recovery days, mobility work, and check-in cadence.",
    icon: "calendar-outline",
  },
  {
    id: "machine",
    label: "Machine Guide",
    title: "Machine guide",
    body: "List machine setup, safe range of motion, warm-up load, and progression rules.",
    icon: "construct-outline",
  },
  {
    id: "recovery",
    label: "Recovery",
    title: "Recovery plan",
    body: "Add sleep, mobility, deload, and soreness-management notes for the week.",
    icon: "leaf-outline",
  },
];

export const clientDetailTabs: Array<{ label: string; value: ClientDetailTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Plan", value: "plan" },
  { label: "Sessions", value: "sessions" },
] as Array<{ label: string; value: ClientDetailTab }>;

export type ClientDetailTab = "overview" | "plan" | "sessions";

export const clientDetailTabLabelKeys: Record<ClientDetailTab, TranslationKey> = {
  overview: "trainer.clientDetail.overviewTab",
  plan: "trainer.clientDetail.planTab",
  sessions: "trainer.clientDetail.sessionsTab",
};

export function trainerClientDetailPath(clientId: string, tab: ClientDetailTab) {
  return `/trainer/clients/${clientId}${tab === "overview" ? "" : `/${tab}`}`;
}

export function selectedTrainerClient(
  clients: TrainerClientRecord[] | undefined,
  clientId: string,
) {
  return (
    clients?.find((candidate) => candidate.memberUserId === clientId || candidate.id === clientId) ??
    clients?.[0] ??
    null
  );
}

export function fitnessGoalFor(client: TrainerClientRecord | null | undefined, fallback: string) {
  return client?.summary?.fitnessGoal ?? client?.profile?.fitnessGoal ?? fallback;
}

export function averageCompletionFor(client?: TrainerClientRecord | null) {
  const feedback = client?.summary?.recentFeedback ?? [];
  if (!feedback.length) return null;
  return Math.round(
    feedback.reduce((sum, entry) => sum + (entry.completionPct ?? 0), 0) / feedback.length,
  );
}

export function progressTimelineFor(
  client: TrainerClientRecord | null | undefined,
  copy: {
    logged: string;
    planFeedback: string;
    planProgress: string;
    complete: (percent: number) => string;
    durationMinutes: (minutes: number) => string;
  },
) {
  return [
    ...(client?.summary?.recentFeedback ?? []).map((entry) => ({
      id: `feedback-${entry.assignmentId}-${entry.updatedAt ?? "latest"}`,
      at: entry.updatedAt ?? "",
      title: entry.feedback ? copy.planFeedback : copy.planProgress,
      body: entry.feedback ?? copy.complete(entry.completionPct ?? 0),
      status: `${entry.completionPct}%`,
      tone: "blue" as const,
    })),
    ...(client?.summary?.recentWorkouts ?? []).map((workout) => ({
      id: `workout-${workout.id}`,
      at: workout.startedAt ?? "",
      title: workout.title,
      body: [
        workout.workoutType,
        workout.durationMinutes ? copy.durationMinutes(workout.durationMinutes) : null,
        workout.notes,
      ]
        .filter(Boolean)
        .join(" · "),
      status: copy.logged,
      tone: "blue" as const,
    })),
  ].sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime());
}
