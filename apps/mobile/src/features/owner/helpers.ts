export function cleanReviewReason(reason?: string | null) {
  if (!reason) return "Desk approval is required.";
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

export function titleCase(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function memberInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Member";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function redactPhone(phone?: string | null) {
  if (!phone) return "No phone";
  return `****${phone.slice(-4)}`;
}

export function phoneRevealStorageKey(orgId?: string | null) {
  return `zook_revealed_owner_phones_${orgId ?? "none"}`;
}
