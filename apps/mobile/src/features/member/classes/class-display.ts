import { Ionicons } from "@expo/vector-icons";

import type { PillTone } from "@/components/primitives";
import { gradients } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export type ClassVisual = { icon: IconName; tone: PillTone };

const CLASS_VISUALS: Record<string, ClassVisual> = {
  hiit: { icon: "flash-outline", tone: "red" },
  strength: { icon: "barbell-outline", tone: "lime" },
  yoga: { icon: "leaf-outline", tone: "violet" },
  cycling: { icon: "bicycle-outline", tone: "blue" },
  spin: { icon: "bicycle-outline", tone: "blue" },
  dance: { icon: "musical-notes-outline", tone: "violet" },
  zumba: { icon: "musical-notes-outline", tone: "violet" },
  mobility: { icon: "body-outline", tone: "amber" },
  boxing: { icon: "hand-left-outline", tone: "red" },
  cardio: { icon: "heart-outline", tone: "red" },
  pilates: { icon: "body-outline", tone: "amber" },
};

const TONE_GRADIENT: Record<PillTone, readonly [string, string]> = {
  red: gradients.classRed,
  blue: gradients.classBlue,
  violet: gradients.classViolet,
  amber: gradients.classAmber,
  lime: gradients.heroCardAccent,
  neutral: gradients.cardSheen,
};

export function classTypeVisual(classType?: string | null): ClassVisual {
  const key = (classType ?? "").trim().toLowerCase();
  return CLASS_VISUALS[key] ?? { icon: "fitness-outline", tone: "blue" };
}

/** Soft top-tinted gradient matching the class-type accent, for card surfaces. */
export function classTypeGradient(classType?: string | null): readonly [string, string] {
  return TONE_GRADIENT[classTypeVisual(classType).tone];
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** "Today" / "Tomorrow" / "Wed, 25 Jun" — used for day-grouped schedules. */
export function classDayHeading(value?: string | Date | null): string {
  if (!value) return "Scheduled";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Scheduled";
  const diffDays = Math.round(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** Compact "Today · 6:30 PM" for tight spaces like the Home strip. */
export function classDayTime(value?: string | Date | null): string {
  if (!value) return "Scheduled";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Scheduled";
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${classDayHeading(date)} · ${time}`;
}
