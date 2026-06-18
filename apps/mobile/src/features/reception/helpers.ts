import { formatAgeLabel } from "@/lib/formatting";

export function deskReasonCopy(reason?: string | null) {
  if (!reason) return "Desk approval required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

export function ageLabel(dateOfBirth?: string | null) {
  return formatAgeLabel(dateOfBirth);
}

export function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_reception_phones_${orgId ?? "none"}`;
}
