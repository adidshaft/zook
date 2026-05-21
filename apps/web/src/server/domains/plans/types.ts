export interface PlanExerciseSummary {
  id: string;
  name: string;
  sets?: string | null;
  equipment?: string | null;
  reps?: string | null;
  day?: string | null;
  raw?: string | null;
  orderIndex: number;
  completed: boolean;
}
