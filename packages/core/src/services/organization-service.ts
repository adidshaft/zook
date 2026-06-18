import type { GymJoinMode, GymVisibility, OrganizationStatus } from "../types";
import { usernameSchema } from "../validators";

export function createTrialWindow(now = new Date()): { trialStartAt: Date; trialEndAt: Date; status: OrganizationStatus } {
  const trialEndAt = new Date(now);
  trialEndAt.setMonth(trialEndAt.getMonth() + 2);
  return { trialStartAt: now, trialEndAt, status: "TRIAL_ACTIVE" };
}

export function normalizeUsername(username: string): string {
  return usernameSchema.parse(username);
}

export function normalizeUsernameInput(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function canPubliclyAccessGym(input: {
  visibility: GymVisibility;
  joinMode: GymJoinMode;
  hasInviteOrReferral?: boolean;
}): boolean {
  if (input.visibility === "PUBLIC") {
    return true;
  }
  if (input.visibility === "INVITE_ONLY") {
    return Boolean(input.hasInviteOrReferral);
  }
  return false;
}

export function assertOrganizationOperational(status: OrganizationStatus): void {
  if (status === "SUSPENDED" || status === "CANCELLED") {
    throw new Error("Organization is not operational");
  }
}
