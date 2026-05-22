import {
  Bell,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileText,
  Globe2,
  History,
  LayoutGrid,
  Receipt,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import type { Permission } from "@zook/core";
import type { DashboardMessages, NavItem } from "./types";

export const navGroups: Array<{ key: keyof DashboardMessages["navGroups"]; items: NavItem[] }> = [
  {
    key: "operations",
    items: [
      { key: "today", label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
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
        key: "joinRequests",
        label: "Join Requests",
        href: "/dashboard/members/join-requests",
        icon: UserPlus,
        badgeKey: "joinRequests",
        indent: true,
        permissions: ["MEMBERS_VIEW"],
      },
      {
        key: "plans",
        label: "Plans",
        href: "/dashboard/plans",
        icon: ClipboardList,
        permissions: ["MEMBERSHIP_PLAN_MANAGE"],
      },
      {
        key: "coupons",
        label: "Coupons",
        href: "/dashboard/plans/coupons",
        icon: ClipboardList,
        hidden: true,
        permissions: ["COUPONS_MANAGE"],
      },
      {
        key: "offers",
        label: "Offers",
        href: "/dashboard/plans/offers",
        icon: ClipboardList,
        hidden: true,
        permissions: ["COUPONS_MANAGE"],
      },
      {
        key: "referrals",
        label: "Referrals",
        href: "/dashboard/plans/referrals",
        icon: ClipboardList,
        hidden: true,
        permissions: ["REFERRALS_MANAGE"],
      },
      {
        key: "payments",
        label: "Payments",
        href: "/dashboard/payments",
        icon: ReceiptText,
        permissions: ["PAYMENTS_VIEW"],
      },
      {
        key: "refunds",
        label: "Refunds",
        href: "/dashboard/payments/refunds",
        icon: Receipt,
        hidden: true,
        permissions: ["PAYMENTS_REFUND"],
      },
      {
        key: "attendance",
        label: "Attendance",
        href: "/dashboard/attendance",
        icon: CalendarDays,
        permissions: ["ATTENDANCE_QR_DISPLAY", "ATTENDANCE_APPROVE"],
      },
      {
        key: "trainers",
        label: "Trainers & PT",
        href: "/dashboard/staff",
        icon: Dumbbell,
        hidden: true,
        permissions: ["ORG_MANAGE_STAFF"],
      },
      {
        key: "ai",
        label: "Plans & AI",
        href: "/dashboard/ai",
        icon: Sparkles,
        permissions: ["ORG_VIEW_REPORTS", "AI_MANAGE_SETTINGS"],
      },
      {
        key: "messages",
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        permissions: ["NOTIFICATION_CREATE_DRAFT"],
      },
      {
        key: "shop",
        label: "Shop",
        href: "/dashboard/shop",
        icon: Store,
        permissions: ["SHOP_MANAGE_PRODUCTS"],
      },
      {
        key: "shopOrders",
        label: "Shop orders",
        href: "/dashboard/shop/orders",
        icon: Store,
        hidden: true,
        permissions: ["SHOP_FULFILL_ORDER"],
      },
      {
        key: "reports",
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileText,
        permissions: ["ORG_VIEW_REPORTS"],
      },
      {
        key: "team",
        label: "Staff",
        href: "/dashboard/staff",
        icon: Users,
        permissions: ["ORG_MANAGE_STAFF"],
      },
      {
        key: "templates",
        label: "Templates",
        href: "/dashboard/notifications/templates",
        icon: Bell,
        hidden: true,
        permissions: ["NOTIFICATION_MANAGE_TEMPLATES"],
      },
      {
        key: "history",
        label: "History",
        href: "/dashboard/notifications/history",
        icon: History,
        hidden: true,
        permissions: ["NOTIFICATION_CREATE_DRAFT"],
      },
    ],
  },
  {
    key: "settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        permissions: ["ORG_MANAGE_PROFILE"],
      },
      {
        key: "activity",
        label: "Audit",
        href: "/dashboard/audit",
        icon: ShieldCheck,
        shortLabel: "Activity",
        permissions: ["PRIVACY_VIEW_AUDIT"],
      },
      {
        key: "branches",
        label: "Branches",
        href: "/dashboard/branches",
        icon: Globe2,
        hidden: true,
        permissions: ["ORG_MANAGE_LOCATION"],
      },
      {
        key: "gymProfile",
        label: "Gym profile",
        href: "/dashboard/public-profile",
        icon: Globe2,
        hidden: true,
        permissions: ["ORG_MANAGE_PROFILE"],
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
          !item.hidden &&
          (!item.permissions || item.permissions.some((permission) => permissions.has(permission))),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function isActiveNav(href: string, sectionKey: string) {
  if (href === "/dashboard") {
    return sectionKey === "";
  }
  const hrefKey = href.replace("/dashboard/", "");
  if (hrefKey === "plans") {
    return sectionKey === "plans" || sectionKey.startsWith("plans/");
  }
  if (["notifications", "payments"].includes(hrefKey)) {
    return sectionKey === hrefKey;
  }
  return sectionKey === hrefKey || sectionKey.startsWith(`${hrefKey}/`);
}
