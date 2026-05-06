export interface TrainerCommissionPtSubscription {
  trainerUserId: string;
  amountPaise: number;
  createdAt: Date;
  status?: string;
}

export interface TrainerCommissionPlanAssignment {
  assignedById: string;
  createdAt: Date;
  active?: boolean;
}

export interface TrainerCommissionSummary {
  orgId: string;
  trainerId: string;
  period: Date;
  ptSessionCount: number;
  planAssignmentCount: number;
  commissionBps: number;
  totalPaise: number;
}

function monthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function nextMonthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
}

function isWithinPeriod(value: Date, period: Date) {
  const start = monthStart(period);
  const end = nextMonthStart(period);
  return value >= start && value < end;
}

function assertCommissionBps(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error("Commission rate must be between 0 and 10000 basis points.");
  }
}

export function calculateTrainerCommissions(input: {
  orgId: string;
  period: Date;
  ptSubscriptions: TrainerCommissionPtSubscription[];
  planAssignments: TrainerCommissionPlanAssignment[];
  commissionBps: number;
  planAssignmentCommissionPaise?: number;
}): TrainerCommissionSummary[] {
  assertCommissionBps(input.commissionBps);
  const planAssignmentCommissionPaise = input.planAssignmentCommissionPaise ?? 0;
  if (!Number.isInteger(planAssignmentCommissionPaise) || planAssignmentCommissionPaise < 0) {
    throw new Error("Plan assignment commission must be a non-negative integer amount in paise.");
  }

  const summaries = new Map<
    string,
    TrainerCommissionSummary & { ptRevenuePaise: number }
  >();
  const getSummary = (trainerId: string) => {
    const existing = summaries.get(trainerId);
    if (existing) {
      return existing;
    }
    const created = {
      orgId: input.orgId,
      trainerId,
      period: monthStart(input.period),
      ptSessionCount: 0,
      planAssignmentCount: 0,
      commissionBps: input.commissionBps,
      totalPaise: 0,
      ptRevenuePaise: 0,
    };
    summaries.set(trainerId, created);
    return created;
  };

  for (const subscription of input.ptSubscriptions) {
    if (!isWithinPeriod(subscription.createdAt, input.period)) {
      continue;
    }
    if (subscription.status && !["ACTIVE", "SUCCEEDED", "PAID"].includes(subscription.status)) {
      continue;
    }
    if (!Number.isInteger(subscription.amountPaise) || subscription.amountPaise < 0) {
      throw new Error("PT subscription amount must be a non-negative integer amount in paise.");
    }
    const summary = getSummary(subscription.trainerUserId);
    summary.ptSessionCount += 1;
    summary.ptRevenuePaise += subscription.amountPaise;
  }

  for (const assignment of input.planAssignments) {
    if (assignment.active === false || !isWithinPeriod(assignment.createdAt, input.period)) {
      continue;
    }
    getSummary(assignment.assignedById).planAssignmentCount += 1;
  }

  return [...summaries.values()]
    .map(({ ptRevenuePaise, ...summary }) => ({
      ...summary,
      totalPaise:
        Math.round((ptRevenuePaise * summary.commissionBps) / 10_000) +
        summary.planAssignmentCount * planAssignmentCommissionPaise,
    }))
    .sort((a, b) => a.trainerId.localeCompare(b.trainerId));
}
