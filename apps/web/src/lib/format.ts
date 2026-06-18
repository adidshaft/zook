export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatInrCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${Math.round(rupees)}`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat("en-IN", options).format(value);
}

export function formatUsageLimit(
  limit: number | null | undefined,
  options: { compact?: boolean; unlimitedLabel?: string } = {},
): string {
  if (limit == null) {
    return options.unlimitedLabel ?? "Unlimited";
  }
  return options.compact ? formatCompactNumber(limit) : String(limit);
}

export function normalizeIndiaPhoneDigits(value: string): string {
  let clean = value;
  if (clean.startsWith("+91")) {
    clean = clean.slice(3);
  }
  let digits = clean.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function formatIndiaPhoneInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "+" || trimmed === "+9" || trimmed === "+91") {
    return trimmed;
  }
  const digits = normalizeIndiaPhoneDigits(value);
  return digits ? `+91 ${digits}` : "+91 ";
}

export function normalizeIndianPincodeInput(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 6);
}

export function normalizeGstinInput(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
}

export function isValidGstin(value: string): boolean {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value);
}

function coerceDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = coerceDate(value);
  if (!date) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatWeekdayDate(value: Date | string | null | undefined): string {
  const date = coerceDate(value);
  if (!date) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const date = coerceDate(value);
  if (!date) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTime(value: Date | string | null | undefined): string {
  const date = coerceDate(value);
  if (!date) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCountdownMs(remainingMs: number): string {
  const safeMs = Math.max(0, remainingMs);
  const minutes = Math.floor(safeMs / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }
  if (value === "RECEPTIONIST") {
    return "Reception";
  }
  if (value === "PLATFORM_ADMIN") {
    return "Platform operator";
  }
  return value
    .replace(/[-_]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function joinModeLabel(
  mode: "OPEN_JOIN" | "APPROVAL_REQUIRED" | "INVITE_ONLY" | string | null | undefined,
): string {
  if (mode === "OPEN_JOIN") {
    return "Anyone can join";
  }
  if (mode === "APPROVAL_REQUIRED") {
    return "Approval required";
  }
  if (mode === "INVITE_ONLY") {
    return "Invite only";
  }
  return formatEnumLabel(mode);
}

export function formatDaysRemaining(days: number): string {
  if (days <= 0) {
    return "Ends today";
  }
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function titleFromSection(section?: string[]): string {
  if (!section?.length) {
    return "Today's Operations";
  }
  return section
    .map((part) => {
      if (part === "ai") return "AI workout drafts";
      if (part === "audit") return "Activity log";
      return formatEnumLabel(part);
    })
    .join(" / ");
}
