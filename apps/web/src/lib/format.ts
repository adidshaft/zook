export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(paise / 100);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: value >= 100 ? 0 : 1
  }).format(value);
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
    year: "numeric"
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
    minute: "2-digit"
  }).format(date);
}

export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }
  return value
    .replace(/[-_]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatDaysRemaining(days: number): string {
  if (days <= 0) {
    return "Ends today";
  }
  return `${days} day${days === 1 ? "" : "s"} left`;
}

export function titleFromSection(section?: string[]): string {
  if (!section?.length) {
    return "Today's Command Board";
  }
  return section
    .map((part) => {
      if (part === "ai") return "Plan drafts";
      if (part === "audit") return "Activity history";
      return formatEnumLabel(part);
    })
    .join(" / ");
}
