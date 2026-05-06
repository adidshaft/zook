import type { GymJoinMode } from "../types";

export function joinModeLabel(mode: GymJoinMode): string {
  return {
    OPEN_JOIN: "Anyone can join",
    APPROVAL_REQUIRED: "Approval required",
    INVITE_ONLY: "Invite only",
  }[mode];
}
