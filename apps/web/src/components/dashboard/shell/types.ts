import type { Permission } from "@zook/core";
import type { LucideIcon } from "lucide-react";
import type enMessages from "../../../../messages/dashboard/en.json";

export type DashboardData = Awaited<ReturnType<typeof import("@/lib/data").getDashboardData>>;

export type DashboardMessages = typeof enMessages;

export type DashboardCopy = DashboardMessages;

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  hidden?: boolean;
  permissions?: Permission[];
};
