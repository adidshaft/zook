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
  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10);
}

export function startOfToday() {
  const [year, month, day] = toDateKey(new Date()).split("-").map(Number);
  if (!year || !month || !day) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }
  return new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
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
