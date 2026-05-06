import {
  Bell,
  ClipboardList,
  Dumbbell,
  FileText,
  Globe2,
  History,
  QrCode,
  ReceiptText,
  Shield,
  Store,
  Users,
} from "lucide-react";
import type { Permission } from "@zook/core";
import type { DashboardMessages, NavItem } from "./types";

export const navGroups: Array<{ key: keyof DashboardMessages["navGroups"]; items: NavItem[] }> = [
  {
    key: "operations",
    items: [
      { key: "today", label: "Today", href: "/dashboard", icon: Dumbbell },
      {
        key: "attendance",
        label: "Attendance",
        href: "/dashboard/attendance",
        icon: QrCode,
        permissions: ["ATTENDANCE_QR_DISPLAY", "ATTENDANCE_APPROVE"],
      },
      {
        key: "payments",
        label: "Payments",
        href: "/dashboard/payments",
        icon: ReceiptText,
        permissions: ["PAYMENTS_VIEW"],
      },
      {
        key: "shop",
        label: "Shop",
        href: "/dashboard/shop/products",
        icon: Store,
        permissions: ["SHOP_MANAGE_PRODUCTS"],
      },
      {
        key: "reports",
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        permissions: ["ORG_VIEW_REPORTS"],
      },
    ],
  },
  {
    key: "members",
    items: [
      {
        key: "members",
        label: "Members",
        href: "/dashboard/members",
        icon: Users,
        permissions: ["MEMBERS_VIEW"],
      },
      {
        key: "plans",
        label: "Plans",
        href: "/dashboard/membership-plans",
        icon: ClipboardList,
        permissions: ["MEMBERSHIP_PLAN_MANAGE"],
      },
      {
        key: "team",
        label: "Team",
        href: "/dashboard/staff",
        icon: Shield,
        permissions: ["ORG_MANAGE_STAFF"],
      },
    ],
  },
  {
    key: "messages",
    items: [
      {
        key: "messages",
        label: "Messages",
        href: "/dashboard/notifications",
        icon: Bell,
        permissions: ["NOTIFICATION_CREATE_DRAFT"],
      },
    ],
  },
  {
    key: "settings",
    items: [
      {
        key: "branches",
        label: "Branches",
        href: "/dashboard/branches",
        icon: Globe2,
        permissions: ["ORG_MANAGE_LOCATION"],
      },
      {
        key: "gymProfile",
        label: "Gym profile",
        href: "/dashboard/public-profile",
        icon: Globe2,
        permissions: ["ORG_MANAGE_PROFILE"],
      },
      {
        key: "activity",
        label: "Audit log",
        href: "/dashboard/audit",
        icon: History,
        shortLabel: "Activity",
        permissions: ["PRIVACY_VIEW_AUDIT"],
      },
    ],
  },
];

export function filterNavGroups(groups: typeof navGroups, permissions: Set<Permission>) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.permissions ||
          item.permissions.some((permission) => permissions.has(permission)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function isActiveNav(href: string, sectionKey: string) {
  if (href === "/dashboard") {
    return sectionKey === "";
  }
  const hrefKey = href.replace("/dashboard/", "");
  return sectionKey === hrefKey || sectionKey.startsWith(`${hrefKey}/`);
}
