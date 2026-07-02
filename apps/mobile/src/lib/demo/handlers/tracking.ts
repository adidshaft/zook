function nowIso() {
  return new Date().toISOString();
}

function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoBody(init: { body?: unknown }) {
  return init.body && typeof init.body === "object" ? (init.body as Record<string, unknown>) : {};
}

type DemoWorkoutLog = {
  id: string;
  title: string;
  workoutType: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  intensity: string | null;
  notes: string | null;
  exercises: Array<{
    id: string;
    exerciseName: string;
    setsCompleted?: number | null;
    reps?: number | null;
    weightKg?: number | null;
    completed: boolean;
  }>;
};

const demoWorkoutLogs: DemoWorkoutLog[] = [
  {
    id: "workout-log-push",
    title: "Push Day",
    workoutType: "STRENGTH",
    startedAt: hoursAgoIso(6),
    endedAt: hoursAgoIso(5),
    durationMinutes: 55,
    intensity: "HARD",
    notes: "Hit a new top set on bench.",
    exercises: [
      { id: "wl-1", exerciseName: "Bench Press", setsCompleted: 4, reps: 8, weightKg: 60, completed: true },
      { id: "wl-2", exerciseName: "Incline Dumbbell Press", setsCompleted: 3, reps: 10, weightKg: 22, completed: true },
      { id: "wl-3", exerciseName: "Shoulder Press", setsCompleted: 3, reps: 10, weightKg: 18, completed: true },
    ],
  },
  {
    id: "workout-log-legs",
    title: "Leg Day",
    workoutType: "STRENGTH",
    startedAt: hoursAgoIso(54),
    endedAt: hoursAgoIso(53),
    durationMinutes: 48,
    intensity: "MODERATE",
    notes: null,
    exercises: [
      { id: "wl-4", exerciseName: "Back Squat", setsCompleted: 4, reps: 6, weightKg: 80, completed: true },
      { id: "wl-5", exerciseName: "Romanian Deadlift", setsCompleted: 3, reps: 10, weightKg: 60, completed: true },
    ],
  },
  {
    id: "workout-log-cardio",
    title: "Zone 2 Cardio",
    workoutType: "CARDIO",
    startedAt: hoursAgoIso(78),
    endedAt: hoursAgoIso(77),
    durationMinutes: 30,
    intensity: "EASY",
    notes: "Treadmill incline walk.",
    exercises: [],
  },
];

type DemoBodyProgress = {
  id: string;
  memberUserId: string;
  measuredAt: string;
  weightKg: number | null;
  waistCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  bodyFatPercent: number | null;
  notes: string | null;
};

const demoBodyProgress: DemoBodyProgress[] = [
  {
    id: "body-progress-1",
    memberUserId: "user-aarav",
    measuredAt: hoursAgoIso(6),
    weightKg: 78,
    waistCm: 84,
    chestCm: 102,
    armCm: 37,
    bodyFatPercent: 18,
    notes: null,
  },
  {
    id: "body-progress-2",
    memberUserId: "user-aarav",
    measuredAt: hoursAgoIso(24 * 14),
    weightKg: 79.5,
    waistCm: 86,
    chestCm: 101,
    armCm: 36,
    bodyFatPercent: 19.5,
    notes: "Start of the cut.",
  },
  {
    id: "body-progress-3",
    memberUserId: "user-aarav",
    measuredAt: hoursAgoIso(24 * 28),
    weightKg: 81,
    waistCm: 88,
    chestCm: 100,
    armCm: 35.5,
    bodyFatPercent: 21,
    notes: "Baseline measurement.",
  },
  {
    id: "body-progress-riya-1",
    memberUserId: "user-riya",
    measuredAt: hoursAgoIso(10),
    weightKg: 62,
    waistCm: 70,
    chestCm: 88,
    armCm: 27,
    bodyFatPercent: 24,
    notes: null,
  },
  {
    id: "body-progress-riya-2",
    memberUserId: "user-riya",
    measuredAt: hoursAgoIso(24 * 10),
    weightKg: 63.5,
    waistCm: 72,
    chestCm: 87,
    armCm: 26.5,
    bodyFatPercent: 25.5,
    notes: "Start of the programme.",
  },
];

type DemoHabitLog = {
  id: string;
  habitId: string;
  loggedAt: string;
  value: number | null;
  notes: string | null;
  completed: boolean;
};

type DemoHabit = {
  id: string;
  title: string;
  category: string;
  targetValue: number | null;
  unit: string | null;
  frequency: string;
  visibility: string;
  active: boolean;
  createdAt: string;
  logs: DemoHabitLog[];
};

const demoHabits: DemoHabit[] = [
  {
    id: "habit-water",
    title: "Drink 3L water",
    category: "HYDRATION",
    targetValue: 3,
    unit: "L",
    frequency: "DAILY",
    visibility: "PRIVATE",
    active: true,
    createdAt: hoursAgoIso(24 * 9),
    logs: [
      {
        id: "habit-water-log-1",
        habitId: "habit-water",
        loggedAt: hoursAgoIso(3),
        value: null,
        notes: null,
        completed: true,
      },
      {
        id: "habit-water-log-2",
        habitId: "habit-water",
        loggedAt: hoursAgoIso(27),
        value: null,
        notes: null,
        completed: true,
      },
    ],
  },
  {
    id: "habit-steps",
    title: "10,000 steps",
    category: "STEPS",
    targetValue: 10000,
    unit: "steps",
    frequency: "DAILY",
    visibility: "PRIVATE",
    active: true,
    createdAt: hoursAgoIso(24 * 5),
    logs: [],
  },
];

function isToday(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function demoCreateHabit(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const habit: DemoHabit = {
    id: `habit-${Date.now()}`,
    title: String(body.title ?? "Habit").trim() || "Habit",
    category: String(body.category ?? "CUSTOM"),
    targetValue: toNumber(body.targetValue),
    unit: body.unit ? String(body.unit) : null,
    frequency: String(body.frequency ?? "DAILY"),
    visibility: String(body.visibility ?? "PRIVATE"),
    active: true,
    createdAt: nowIso(),
    logs: [],
  };
  demoHabits.unshift(habit);
  return { habit };
}

function demoLogHabit(habitId: string, body: Record<string, unknown>) {
  const habit = demoHabits.find((entry) => entry.id === habitId);
  if (!habit) {
    throw new Error("Habit not found.");
  }
  const completed = body.completed !== false;
  const existingTodayIndex = habit.logs.findIndex((log) => isToday(log.loggedAt));
  if (existingTodayIndex >= 0 && !completed) {
    habit.logs.splice(existingTodayIndex, 1);
    return { log: { id: `habit-log-${Date.now()}` } };
  }
  const log: DemoHabitLog = {
    id: `habit-log-${Date.now()}`,
    habitId: habit.id,
    loggedAt: nowIso(),
    value: null,
    notes: null,
    completed: true,
  };
  if (existingTodayIndex < 0) {
    habit.logs.unshift(log);
  }
  return { log };
}

function startOfThisWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function demoTrackingSummary() {
  const weekStart = startOfThisWeek();
  const weeklyCount = demoWorkoutLogs.filter(
    (workout) => new Date(workout.startedAt).getTime() >= weekStart,
  ).length;
  const totalDurationMinutes = demoWorkoutLogs.reduce(
    (total, workout) => total + (workout.durationMinutes ?? 0),
    0,
  );
  return {
    summary: {
      weeklyCount,
      totalDuration: totalDurationMinutes,
      recentCount: demoWorkoutLogs.length,
    },
    recentWorkouts: demoWorkoutLogs.slice(0, 3),
    latestBodyProgress: demoMemberBodyProgress("user-aarav")[0] ?? {
      weightKg: 78,
      measuredAt: nowIso(),
    },
    habits: demoHabits,
  };
}

function demoMemberBodyProgress(memberUserId: string) {
  return demoBodyProgress
    .filter((entry) => entry.memberUserId === memberUserId)
    .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
}

function demoCreateWorkout(body: Record<string, unknown>) {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const exercisesInput = Array.isArray(body.exercises) ? body.exercises : [];
  const startedAt = body.startedAt ? String(body.startedAt) : nowIso();
  const durationMinutes = toNumber(body.durationMinutes);
  const workout: DemoWorkoutLog = {
    id: `workout-log-${Date.now()}`,
    title: String(body.title ?? "Workout").trim() || "Workout",
    workoutType: String(body.workoutType ?? "STRENGTH"),
    startedAt,
    endedAt: body.endedAt ? String(body.endedAt) : nowIso(),
    durationMinutes,
    intensity: body.intensity ? String(body.intensity) : null,
    notes: body.notes ? String(body.notes) : null,
    exercises: exercisesInput.map((entry, index) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        id: `wl-new-${Date.now()}-${index}`,
        exerciseName: String(item.exerciseName ?? item.name ?? "Exercise"),
        setsCompleted: toNumber(item.setsCompleted ?? item.sets),
        reps: toNumber(item.reps),
        weightKg: toNumber(item.weightKg),
        completed: item.completed !== false,
      };
    }),
  };
  demoWorkoutLogs.unshift(workout);
  return { workout };
}

function demoRecordBodyProgress(body: Record<string, unknown>, memberUserId = "user-aarav") {
  const toNumber = (value: unknown) => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const entry: DemoBodyProgress = {
    id: `body-progress-${Date.now()}`,
    memberUserId,
    measuredAt: body.measuredAt ? String(body.measuredAt) : nowIso(),
    weightKg: toNumber(body.weightKg),
    waistCm: toNumber(body.waistCm),
    chestCm: toNumber(body.chestCm),
    armCm: toNumber(body.armCm),
    bodyFatPercent: toNumber(body.bodyFatPercent),
    notes: body.notes ? String(body.notes) : null,
  };
  demoBodyProgress.unshift(entry);
  return { entry: { id: entry.id } };
}

export function trackingDemoResponse(pathname: string, method: string, init: { body?: unknown }) {
  if (pathname === "/me/goals") return { goals: [] };
  if (pathname === "/me/tracking/workouts") {
    if (method === "POST") {
      return demoCreateWorkout(demoBody(init));
    }
    return { workouts: demoWorkoutLogs };
  }
  const habitLogMatch = pathname.match(/^\/me\/tracking\/habits\/([^/]+)\/log$/);
  if (habitLogMatch && method === "POST") {
    return demoLogHabit(habitLogMatch[1], demoBody(init));
  }
  if (pathname === "/me/tracking/habits") {
    if (method === "POST") {
      return demoCreateHabit(demoBody(init));
    }
    return { habits: demoHabits };
  }
  if (pathname === "/me/tracking/body-progress") {
    if (method === "POST") {
      return demoRecordBodyProgress(demoBody(init));
    }
    return { entries: demoMemberBodyProgress("user-aarav") };
  }
  const clientBodyProgressMatch = pathname.match(
    /^\/orgs\/[^/]+\/trainers\/[^/]+\/clients\/([^/]+)\/body-progress$/,
  );
  if (clientBodyProgressMatch) {
    const clientId = clientBodyProgressMatch[1];
    if (method === "POST") {
      return demoRecordBodyProgress(demoBody(init), clientId);
    }
    return { entries: demoMemberBodyProgress(clientId) };
  }
  if (pathname === "/me/tracking/summary") {
    return demoTrackingSummary();
  }
  return undefined;
}
