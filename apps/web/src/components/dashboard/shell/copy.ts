import enMessages from "../../../../messages/dashboard/en.json";
import hiMessages from "../../../../messages/dashboard/hi.json";
import type { DashboardCopy, DashboardMessages, NavItem } from "./types";

export const dashboardMessages = {
  en: enMessages,
  hi: hiMessages,
} satisfies Record<"en" | "hi", DashboardMessages>;

export function isHindi(locale?: string | null) {
  return locale === "hi";
}

export function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function translatedGroupLabel(
  copy: DashboardCopy,
  key: keyof DashboardCopy["navGroups"],
) {
  return copy.navGroups[key];
}

export function translatedNavLabel(copy: DashboardCopy, item: NavItem) {
  return copy.nav[item.key as keyof typeof copy.nav] ?? item.label;
}
