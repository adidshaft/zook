import type { Permission } from "@zook/core";
import type { LucideIcon } from "lucide-react";
import type { DashboardData as DashboardShellData } from "@/lib/data";
import type enMessages from "../../../../messages/dashboard/en.json";

export type DashboardData = DashboardShellData;

export type DashboardMessages = typeof enMessages;

export type DashboardCopy = DashboardMessages;

export type UserMenuCopy = {
  common: {
    account: string;
    language: string;
    english: string;
    hindi: string;
    switchOrganization: string;
    signOut: string;
    signingOut: string;
  };
};

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  shortLabel?: string;
  hidden?: boolean;
  indent?: boolean;
  permissions?: Permission[];
  badgeKey?: "joinRequests" | "lowStockProducts" | "notificationQueueCount" | "pendingAttendanceApprovals";
};
