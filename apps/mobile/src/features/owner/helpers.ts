export function cleanReviewReason(reason?: string | null) {
  if (!reason) return "Desk approval is required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}
