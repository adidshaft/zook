export type BadgeMilestoneCode =
  | "first_checkin"
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "checkin_50"
  | "checkin_100";

export type BadgeMetric = "streakDays" | "totalCheckIns";

export type BadgeMilestoneDefinition = {
  code: BadgeMilestoneCode;
  name: string;
  description: string;
  icon: string;
  metric: BadgeMetric;
  target: number;
};

export type NextBadgeMilestone = BadgeMilestoneDefinition & {
  current: number;
  remaining: number;
  progress: number;
};

export const badgeMilestoneDefinitions: BadgeMilestoneDefinition[] = [
  {
    code: "first_checkin",
    name: "First check-in",
    description: "Completed the first gym check-in.",
    icon: "checkmark-circle-outline",
    metric: "totalCheckIns",
    target: 1,
  },
  {
    code: "streak_7",
    name: "7-day streak",
    description: "Checked in for 7 days in a row.",
    icon: "flame-outline",
    metric: "streakDays",
    target: 7,
  },
  {
    code: "streak_30",
    name: "30-day streak",
    description: "Built a 30-day training streak.",
    icon: "flame-outline",
    metric: "streakDays",
    target: 30,
  },
  {
    code: "checkin_50",
    name: "50 check-ins",
    description: "Completed 50 gym check-ins.",
    icon: "barbell-outline",
    metric: "totalCheckIns",
    target: 50,
  },
  {
    code: "streak_100",
    name: "100-day streak",
    description: "Built a 100-day training streak.",
    icon: "trophy-outline",
    metric: "streakDays",
    target: 100,
  },
  {
    code: "checkin_100",
    name: "100 check-ins",
    description: "Completed 100 gym check-ins.",
    icon: "trophy-outline",
    metric: "totalCheckIns",
    target: 100,
  },
];

export function getBadgeMilestoneDefinition(code: string) {
  return badgeMilestoneDefinitions.find((definition) => definition.code === code) ?? null;
}

export function evaluateBadgeMilestones(input: {
  streakDays: number;
  totalCheckIns: number;
  existingBadgeCodes?: Iterable<string>;
}) {
  const existing = new Set(input.existingBadgeCodes ?? []);
  return badgeMilestoneDefinitions
    .filter((definition) => !existing.has(definition.code))
    .filter((definition) => {
      const current = definition.metric === "streakDays" ? input.streakDays : input.totalCheckIns;
      return current >= definition.target;
    })
    .map((definition) => definition.code);
}

export function getNextBadgeMilestone(input: {
  streakDays: number;
  totalCheckIns: number;
  existingBadgeCodes?: Iterable<string>;
}): NextBadgeMilestone | null {
  const existing = new Set(input.existingBadgeCodes ?? []);
  const remaining = badgeMilestoneDefinitions
    .filter((definition) => !existing.has(definition.code))
    .map((definition) => {
      const current = definition.metric === "streakDays" ? input.streakDays : input.totalCheckIns;
      return {
        ...definition,
        current,
        remaining: Math.max(0, definition.target - current),
        progress: Math.max(0, Math.min(1, current / Math.max(definition.target, 1))),
      };
    })
    .filter((definition) => definition.remaining > 0)
    .sort((left, right) => left.remaining - right.remaining || left.target - right.target);

  return remaining[0] ?? null;
}
