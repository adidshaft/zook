export interface ClassScheduleInput {
  startTime: Date;
  endTime: Date;
  maxCapacity: number;
}

export interface ClassEnrollmentCapacityInput {
  maxCapacity: number;
  confirmedEnrollmentCount: number;
  allowWaitlist?: boolean;
}

export type ClassEnrollmentDecision = {
  status: "confirmed" | "waitlisted";
  remainingCapacity: number;
};

export function validateClassSchedule(input: ClassScheduleInput) {
  if (!(input.startTime instanceof Date) || Number.isNaN(input.startTime.getTime())) {
    throw new Error("Class start time is required.");
  }
  if (!(input.endTime instanceof Date) || Number.isNaN(input.endTime.getTime())) {
    throw new Error("Class end time is required.");
  }
  if (input.endTime <= input.startTime) {
    throw new Error("Class end time must be after the start time.");
  }
  if (!Number.isInteger(input.maxCapacity) || input.maxCapacity <= 0) {
    throw new Error("Class capacity must be a positive integer.");
  }
}

export function decideClassEnrollment(
  input: ClassEnrollmentCapacityInput,
): ClassEnrollmentDecision {
  if (!Number.isInteger(input.maxCapacity) || input.maxCapacity <= 0) {
    throw new Error("Class capacity must be a positive integer.");
  }
  if (!Number.isInteger(input.confirmedEnrollmentCount) || input.confirmedEnrollmentCount < 0) {
    throw new Error("Confirmed enrollment count must be a non-negative integer.");
  }
  const remainingCapacity = Math.max(0, input.maxCapacity - input.confirmedEnrollmentCount);
  if (remainingCapacity > 0) {
    return { status: "confirmed", remainingCapacity: remainingCapacity - 1 };
  }
  if (input.allowWaitlist) {
    return { status: "waitlisted", remainingCapacity: 0 };
  }
  throw new Error("Class is full.");
}
