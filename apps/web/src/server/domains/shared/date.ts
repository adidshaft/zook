export function toDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : toIstDateKeyFallback(date);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toIstDateKeyFallback(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function istDateParts(date: Date) {
  const [year, month, day] = toDateKey(date).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
}

export function startOfDayIst(date: Date) {
  const parts = istDateParts(date);
  if (!parts) {
    const [year, month, day] = toIstDateKeyFallback(date).split("-").map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!, -5, -30, 0, 0));
  }
  const { year, month, day } = parts;
  return new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
}

export function startOfMonthIst(date: Date) {
  const parts = istDateParts(date);
  if (!parts) {
    const [year, month] = toIstDateKeyFallback(date).split("-").map(Number);
    return new Date(Date.UTC(year!, month! - 1, 1) - IST_OFFSET_MS);
  }
  return new Date(Date.UTC(parts.year, parts.month - 1, 1) - IST_OFFSET_MS);
}

export function startOfToday() {
  return startOfDayIst(new Date());
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function endOfWindow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function daysUntil(date?: Date | null) {
  if (!date) {
    return null;
  }
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}
