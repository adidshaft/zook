function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(value?: string | Date | null, fallback = "Not available") {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(
  value?: string | Date | null,
  fallback = "Not available",
  locale?: string,
) {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(value?: string | Date | null, fallback = "--") {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleTimeString(undefined, {
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

export function formatUsageLimit(
  limit?: number | null,
  options: { compact?: boolean; unlimitedLabel?: string } = {},
) {
  if (limit == null) {
    return options.unlimitedLabel ?? "Unlimited";
  }
  return options.compact ? formatCompactNumber(limit) : String(limit);
}

export function formatVisitLimit(limit?: number | null, fallback = "Unlimited") {
  if (!limit) {
    return fallback;
  }
  return `${limit} ${limit === 1 ? "visit" : "visits"}`;
}

export function toneForShopOrderStatus(status?: string | null) {
  if (status === "FULFILLED" || status === "READY_FOR_PICKUP" || status === "PAID") {
    return "lime" as const;
  }
  if (status === "PENDING_PAYMENT") {
    return "amber" as const;
  }
  if (status === "FAILED" || status === "CANCELLED" || status === "REFUNDED") {
    return "red" as const;
  }
  return "neutral" as const;
}

export function formatElapsedTimer(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatCompactMinutes(
  minutes?: number | null,
  options: { includeZeroMinutes?: boolean; separator?: string } = {},
) {
  const totalMinutes = Math.max(0, Math.floor(minutes ?? 0));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (!hours) {
    return `${remainingMinutes}m`;
  }
  const separator = options.separator ?? "";
  if (remainingMinutes || options.includeZeroMinutes) {
    return `${hours}h${separator}${remainingMinutes}m`;
  }
  return `${hours}h`;
}

export function formatDurationSeconds(
  totalSeconds?: number | null,
  options: {
    fallback?: string;
    includeZeroMinutes?: boolean;
    minimumMinutes?: number;
    separator?: string;
  } = {},
) {
  if (typeof totalSeconds !== "number" || totalSeconds < 0) {
    return options.fallback ?? "In progress";
  }
  const minutes = Math.max(
    options.minimumMinutes ?? 0,
    Math.floor(Math.max(0, totalSeconds) / 60),
  );
  return formatCompactMinutes(minutes, {
    includeZeroMinutes: options.includeZeroMinutes,
    separator: options.separator,
  });
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

export function formatRoleLabel(role?: string | null) {
  if (role === "RECEPTIONIST") return "Reception";
  if (role === "PLATFORM_ADMIN") return "Platform operator";
  return titleCaseFromCode(role);
}

export function formatInitials(name?: string | null, fallback?: string | null) {
  const source = name?.trim() || fallback?.trim() || "Member";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatRedactedPhone(phone?: string | null, fallback = "No phone") {
  if (!phone) return fallback;
  return `****${phone.slice(-4)}`;
}

export function formatAgeLabel(dateOfBirth?: string | Date | null, fallback = "DOB not added") {
  const date = toDate(dateOfBirth);
  if (!date) return fallback;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return `${age} years`;
}

export function formatReviewReason(reason?: string | null, fallback = "Desk approval is required.") {
  if (!reason) return fallback;
  return reason.replace("Attendance approval mode is enabled.", "Desk approval is required.");
}

export function joinModeLabel(
  mode?: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | string | null,
) {
  if (mode === "OPEN_JOIN") return "Anyone can join";
  if (mode === "APPROVAL_REQUIRED") return "Approval required";
  if (mode === "INVITE_ONLY") return "Invite only";
  return titleCaseFromCode(mode);
}

export function joinModeTone(mode?: string | null) {
  if (mode === "OPEN_JOIN") return "lime" as const;
  if (mode === "APPROVAL_REQUIRED") return "amber" as const;
  if (mode === "INVITE_ONLY") return "violet" as const;
  return "neutral" as const;
}
