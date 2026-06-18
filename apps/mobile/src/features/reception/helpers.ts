import { formatReviewReason } from "@/lib/formatting";

export function deskReasonCopy(reason?: string | null) {
  return formatReviewReason(reason, "Desk approval required.");
}
