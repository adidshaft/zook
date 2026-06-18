import { formatReviewReason } from "@/lib/formatting";

export function deskReasonCopy(reason?: string | null) {
  return formatReviewReason(reason, "Desk approval required.");
}

export function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_reception_phones_${orgId ?? "none"}`;
}
