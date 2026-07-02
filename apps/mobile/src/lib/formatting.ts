function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLongDate(
  value?: string | Date | null,
  fallback = "Not available",
  locale?: string,
) {
  const date = toDate(value);
  if (!date) {
    return fallback;
  }
  return date.toLocaleDateString(locale, {
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

export type RelativeDateLabels = {
  unknownTime: string;
  today: string;
  inAboutAnHour: string;
  aboutAnHourAgo: string;
  inHours: (hours: number) => string;
  hoursAgo: (hours: number) => string;
  inDays: (days: number) => string;
  daysAgo: (days: number) => string;
};

const defaultRelativeDateLabels: RelativeDateLabels = {
  unknownTime: "Unknown time",
  today: "Today",
  inAboutAnHour: "In about an hour",
  aboutAnHourAgo: "About an hour ago",
  inHours: (hours) => `In ${hours}h`,
  hoursAgo: (hours) => `${hours}h ago`,
  inDays: (days) => `In ${days}d`,
  daysAgo: (days) => `${days}d ago`,
};

export type ActivityDateLabels = {
  today: string;
  yesterday: string;
  recently: string;
};

const defaultActivityDateLabels: ActivityDateLabels = {
  today: "Today",
  yesterday: "Yesterday",
  recently: "Recently",
};

export function formatRelativeDate(
  value?: string | Date | null,
  labels: RelativeDateLabels = defaultRelativeDateLabels,
) {
  const date = toDate(value);
  if (!date) {
    return labels.unknownTime;
  }

  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  const absHours = Math.abs(diffHours);

  if (absHours < 24) {
    if (absHours <= 1) {
      return diffHours >= 0 ? labels.inAboutAnHour : labels.aboutAnHourAgo;
    }
    return diffHours >= 0 ? labels.inHours(absHours) : labels.hoursAgo(absHours);
  }

  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const absDays = Math.abs(diffDays);

  if (absDays <= 7) {
    if (absDays === 0) {
      return labels.today;
    }
    return diffDays >= 0 ? labels.inDays(absDays) : labels.daysAgo(absDays);
  }

  return formatLongDate(date);
}

export function formatActivityDate(
  value?: string | Date | null,
  labels: ActivityDateLabels = defaultActivityDateLabels,
) {
  const date = toDate(value);
  if (!date) {
    return labels.recently;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (sameDay(date, today)) return `${labels.today}, ${time}`;
  if (sameDay(date, yesterday)) return `${labels.yesterday}, ${time}`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatClassSchedule(startTime?: string | Date | null, endTime?: string | Date | null) {
  const start = toDate(startTime);
  const end = toDate(endTime);
  if (!start || !end) {
    return "Schedule not available";
  }
  return `${start.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })} · ${start.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function formatInr(valuePaise?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((valuePaise ?? 0) / 100);
}

export function normalizeRupeeInput(value: string) {
  const compact = value.replace(/[₹,\s]/g, "").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = compact.split(".");
  const fraction = fractionParts.join("").slice(0, 2);

  if (!compact.includes(".")) {
    return whole;
  }

  return `${whole}.${fraction}`;
}

export function rupeesToPaise(input: string) {
  const normalized = normalizeRupeeInput(input);
  if (!normalized) {
    return null;
  }
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100);
}

export function formatCompactNumber(value?: number | null) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

export function formatSignedPercent(value?: number | null) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  const sign = safe > 0 ? "+" : "";
  return `${sign}${safe.toFixed(Number.isInteger(safe) ? 0 : 1)}%`;
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

export function formatVisitLimit(
  limit?: number | null,
  labels: { unlimited: string; visitOne: string; visitOther: string } = {
    unlimited: "Unlimited",
    visitOne: "visit",
    visitOther: "visits",
  },
) {
  if (!limit) {
    return labels.unlimited;
  }
  return `${limit} ${limit === 1 ? labels.visitOne : labels.visitOther}`;
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

export function toneForSaasSubscriptionStatus(status?: string | null) {
  if (status === "ACTIVE" || status === "TRIAL_ACTIVE") {
    return "lime" as const;
  }
  if (status === "TRIAL_EXPIRING" || status === "PAYMENT_PENDING") {
    return "amber" as const;
  }
  if (status === "TRIAL_EXPIRED" || status === "SUSPENDED" || status === "CANCELLED" || status === "DELETED") {
    return "red" as const;
  }
  return "neutral" as const;
}

export function toneForPaymentStatus(status?: string | null) {
  if (status === "SUCCEEDED") {
    return "lime" as const;
  }
  if (status === "CREATED" || status === "PENDING" || status === "REQUIRES_ACTION") {
    return "amber" as const;
  }
  if (
    status === "FAILED" ||
    status === "CANCELLED" ||
    status === "EXPIRED" ||
    status === "REFUNDED" ||
    status === "PARTIALLY_REFUNDED" ||
    status === "DISPUTED"
  ) {
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

export function formatBranchName(
  orgName: string | null | undefined,
  branchName: string | null | undefined,
  options: { collapseOrgMatch?: boolean; fallback?: string | null } = {},
) {
  const org = orgName?.trim();
  const branch = branchName?.trim();
  if (!branch) return options.fallback ?? null;
  if (!org || !branch.startsWith(org)) return branch;
  return (
    branch.slice(org.length).replace(/^[\s\-·,]+/, "").trim() ||
    (options.collapseOrgMatch ? (options.fallback ?? null) : branch)
  );
}

function stripSharedGymLeadWord(
  orgName: string | null | undefined,
  branchName: string | null | undefined,
) {
  const orgLead = orgName?.trim().split(/\s+/)[0];
  const branch = branchName?.trim();
  if (!orgLead || !branch) return branch ?? null;
  const normalizedLead = orgLead.toLowerCase();
  if (branch.toLowerCase() === normalizedLead) return branch;
  if (!branch.toLowerCase().startsWith(`${normalizedLead} `)) return branch;
  return branch.slice(orgLead.length).trim() || branch;
}

export function localityFromAddress(
  address?: string | null,
  branchName?: string | null,
  orgName?: string | null,
) {
  const branch = branchName?.trim();
  const cleanedBranch = formatBranchName(orgName, branch, {
    collapseOrgMatch: true,
  })?.trim();
  const locality = stripSharedGymLeadWord(orgName, cleanedBranch);
  if (locality) {
    return locality;
  }
  return (
    address
      ?.split(",")
      .map((part) => part.trim())
      .find((part) => part) ?? null
  );
}

function compactLocationSubtitle(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalized = part.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(", ") || null;
}

export function formatGymHeaderIdentity({
  address,
  branchName,
  city,
  orgCity,
  orgName,
}: {
  address?: string | null;
  branchName?: string | null;
  city?: string | null;
  orgCity?: string | null;
  orgName?: string | null;
}) {
  const title = orgName?.trim() || branchName?.trim() || "No active gym";
  const locality = localityFromAddress(address, branchName, orgName);
  const resolvedCity = city?.trim() || orgCity?.trim() || null;
  const subtitle = compactLocationSubtitle([locality, resolvedCity]);

  return { title, subtitle };
}

export function formatOrgLocationLine(
  orgName: string | null | undefined,
  branchName: string | null | undefined,
  city: string | null | undefined,
) {
  const identity = formatGymHeaderIdentity({ branchName, city, orgName });
  return identity.subtitle ? `${identity.title}, ${identity.subtitle}` : identity.title;
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
