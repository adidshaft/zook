import type { GymJoinMode } from "../types";

export function formatEnumLabel(
  value: string | null | undefined,
  options?: { casing?: "title" | "lower" },
): string {
  if (!value) {
    return "Unknown";
  }
  const label = value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return options?.casing === "lower" ? label.toLowerCase() : label;
}

export function joinModeLabel(mode: GymJoinMode): string {
  return {
    OPEN_JOIN: "Anyone can join",
    APPROVAL_REQUIRED: "Approval required",
    INVITE_ONLY: "Invite only",
  }[mode];
}
