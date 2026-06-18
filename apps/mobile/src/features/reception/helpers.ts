export function deskReasonCopy(reason?: string | null) {
  if (!reason) return "Desk approval required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

export function ageLabel(dateOfBirth?: string | null) {
  if (!dateOfBirth) return "DOB not added";
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return "DOB not added";
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDelta = today.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return `${age} years`;
}

export function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_reception_phones_${orgId ?? "none"}`;
}
