"use client";

import { HelpHint, RadioCardGroup } from "../../ui";

type BranchDayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type BranchDayHours = { closed: true } | { open: string; close: string };
type BranchHoursValue = Partial<Record<BranchDayKey, BranchDayHours>>;
type BranchHoursPreset = "standard" | "early" | "always";

const branchDayLabels: Array<{ key: BranchDayKey; label: string }> = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const branchTimeOptions = [
  ...Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }),
  "23:59",
];

function formatBranchTime(value: string) {
  const [hourText = "0", minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return minuteText === "00" ? `${displayHour} ${suffix}` : `${displayHour}:${minuteText} ${suffix}`;
}

function buildBranchHours(open: string, close: string, sundayClosed = false): BranchHoursValue {
  return branchDayLabels.reduce<BranchHoursValue>((hours, day) => {
    hours[day.key] = sundayClosed && day.key === "sun" ? { closed: true } : { open, close };
    return hours;
  }, {});
}

function branchHoursPreset(preset: BranchHoursPreset): BranchHoursValue {
  if (preset === "always") {
    return buildBranchHours("00:00", "23:59");
  }
  return buildBranchHours(preset === "early" ? "05:00" : "06:00", "22:00", true);
}

function isValidDayHours(value: unknown): value is BranchDayHours {
  if (!value || typeof value !== "object") {
    return false;
  }
  const day = value as Record<string, unknown>;
  if (day.closed === true) {
    return true;
  }
  return typeof day.open === "string" && typeof day.close === "string";
}

export function normalizeBranchHours(input: unknown): BranchHoursValue {
  if (!input || typeof input !== "object") {
    return branchHoursPreset("standard");
  }
  const fallbackHours = branchHoursPreset("standard");
  return branchDayLabels.reduce<BranchHoursValue>((hours, day) => {
    const dayHours = (input as Partial<Record<BranchDayKey, unknown>>)[day.key];
    hours[day.key] = isValidDayHours(dayHours)
      ? dayHours
      : (fallbackHours[day.key] ?? { open: "06:00", close: "22:00" });
    return hours;
  }, {});
}

export function parseBranchHoursText(value?: string): BranchHoursValue {
  if (!value?.trim()) {
    return branchHoursPreset("standard");
  }
  try {
    return normalizeBranchHours(JSON.parse(value));
  } catch {
    return branchHoursPreset("standard");
  }
}

export function serializeBranchHours(hours: BranchHoursValue) {
  return JSON.stringify(normalizeBranchHours(hours));
}

export const defaultBranchHoursText = serializeBranchHours(branchHoursPreset("standard"));

export function formatBranchHoursSummary(input: unknown) {
  const hours = normalizeBranchHours(input);
  const openDays = branchDayLabels.filter((day) => {
    const dayHours = hours[day.key];
    return dayHours && !("closed" in dayHours);
  });
  if (!openDays.length) {
    return "Closed all week";
  }
  const first = openDays[0];
  const firstHours = first ? hours[first.key] : null;
  if (!firstHours || "closed" in firstHours) {
    return "Working hours set";
  }
  const sameEveryOpenDay = openDays.every((day) => {
    const dayHours = hours[day.key];
    return (
      dayHours &&
      !("closed" in dayHours) &&
      dayHours.open === firstHours.open &&
      dayHours.close === firstHours.close
    );
  });
  const dayText = openDays.length === 7 ? "Every day" : openDays.map((day) => day.label).join(", ");
  return sameEveryOpenDay
    ? `${dayText}, ${formatBranchTime(firstHours.open)} - ${formatBranchTime(firstHours.close)}`
    : "Custom working hours set";
}

export function BranchHoursEditor({
  value,
  onChange,
  compact = false,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const hours = parseBranchHoursText(value);
  const normalizedHours = serializeBranchHours(hours);
  const activePreset =
    (["standard", "early", "always"] as const).find(
      (preset) => serializeBranchHours(branchHoursPreset(preset)) === normalizedHours,
    ) ?? "custom";
  const allClosed = branchDayLabels.every((day) => {
    const dayHours = hours[day.key];
    return dayHours && "closed" in dayHours;
  });

  function updateDay(dayKey: BranchDayKey, next: BranchDayHours) {
    onChange(serializeBranchHours({ ...hours, [dayKey]: next }));
  }

  function applyPreset(preset: BranchHoursPreset) {
    onChange(serializeBranchHours(branchHoursPreset(preset)));
  }

  function copyMondayToAll() {
    const monday = hours.mon ?? { open: "06:00", close: "22:00" };
    onChange(
      serializeBranchHours(
        branchDayLabels.reduce<BranchHoursValue>((next, day) => {
          next[day.key] = monday;
          return next;
        }, {}),
      ),
    );
  }

  return (
    <div
      className={`rounded-[22px] border border-white/10 bg-black/20 md:col-span-2 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Working hours</p>
          <p className="mt-1 inline-flex items-center gap-2 text-xs text-white/45">
            {formatBranchHoursSummary(hours)}
            <HelpHint label="Working hours" title="Working hours" size="xs">
              Changes save with the parent Branch form. Click Save branch to persist.
            </HelpHint>
          </p>
        </div>
        <button
          type="button"
          onClick={copyMondayToAll}
          className="zook-focus rounded-full border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8"
        >
          Copy Mon
        </button>
      </div>
      <RadioCardGroup
        name="branch-hours-preset"
        label="Working hours preset"
        value={activePreset === "custom" ? "standard" : activePreset}
        columns={3}
        className="mt-3"
        onChange={(preset) => applyPreset(preset as BranchHoursPreset)}
        options={[
          { value: "standard", label: "6 AM - 10 PM" },
          { value: "early", label: "5 AM - 10 PM" },
          { value: "always", label: "Open all day" },
        ]}
      />
      {allClosed ? (
        <p className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          This branch will appear closed on the public page.
        </p>
      ) : null}
      <div className="mt-4 grid gap-2">
        {branchDayLabels.map((day) => {
          const dayHours = hours[day.key] ?? { open: "06:00", close: "22:00" };
          const isClosed = "closed" in dayHours;
          const open = isClosed ? "06:00" : dayHours.open;
          const close = isClosed ? "22:00" : dayHours.close;
          return (
            <div
              key={day.key}
              className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-white/80">{day.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateDay(day.key, isClosed ? { open, close } : { closed: true })
                  }
                  className={`zook-focus rounded-full border px-3 py-2 text-xs font-medium transition ${
                    isClosed
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                      : "border-lime-300/30 bg-lime-300/10 text-lime-100"
                  }`}
                >
                  {isClosed ? "Closed" : "Open"}
                </button>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <select
                  aria-label={day.label}
                  value={open}
                  disabled={isClosed}
                  onChange={(event) => updateDay(day.key, { open: event.target.value, close })}
                  className="zook-focus min-w-0 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none disabled:opacity-35"
                >
                  {branchTimeOptions.map((option) => (
                    <option key={option} value={option} className="bg-black">
                      {formatBranchTime(option)}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-white/35">to</span>
                <select
                  aria-label={day.label}
                  value={close}
                  disabled={isClosed}
                  onChange={(event) => updateDay(day.key, { open, close: event.target.value })}
                  className="zook-focus min-w-0 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none disabled:opacity-35"
                >
                  {branchTimeOptions.map((option) => (
                    <option key={option} value={option} className="bg-black">
                      {formatBranchTime(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
