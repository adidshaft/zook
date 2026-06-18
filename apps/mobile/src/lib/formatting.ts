function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) {
    return "Not available";
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) {
    return "Not available";
  }
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeDate(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) {
    return "Unknown time";
  }

  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const absHours = Math.abs(diffHours);

  if (absHours < 24) {
    if (absHours <= 1) {
      return diffHours >= 0 ? "In about an hour" : "About an hour ago";
    }
    return diffHours >= 0 ? `In ${absHours}h` : `${absHours}h ago`;
  }

  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const absDays = Math.abs(diffDays);

  if (absDays <= 7) {
    if (absDays === 0) {
      return "Today";
    }
    return diffDays >= 0 ? `In ${absDays}d` : `${absDays}d ago`;
  }

  return formatLongDate(date);
}

export function formatInr(valuePaise?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((valuePaise ?? 0) / 100);
}

export function formatCompactNumber(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function titleCaseFromCode(value?: string | null) {
  if (!value) {
    return "Unknown";
  }
  return value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function joinModeLabel(
  mode?: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | string | null,
) {
  if (mode === "OPEN_JOIN") return "Anyone can join";
  if (mode === "APPROVAL_REQUIRED") return "Approval required";
  if (mode === "INVITE_ONLY") return "Invite only";
  return titleCaseFromCode(mode);
}
