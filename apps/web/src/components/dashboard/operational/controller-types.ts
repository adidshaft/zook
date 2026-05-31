import { type Permission, type Role } from "@zook/core";
import {
  type AIUsageRow,
  type BranchScopeSnapshot,
  type DashboardCharts,
  type JoinRequestRow,
  type MemberRow,
  type NotificationSnapshot,
  type OrganizationSnapshot,
  type OrganizationSummary,
  type ProductSnapshot,
} from "@/components/dashboard/types";

export type DashboardOperationalMode =
  | "public-profile"
  | "settings"
  | "join-requests"
  | "attendance"
  | "notification-templates"
  | "notification-history"
  | "notifications"
  | "reports"
  | "shop"
  | "staff"
  | "plan-coupons"
  | "plan-offers"
  | "plan-referrals"
  | "plans"
  | "billing"
  | "payment-refunds"
  | "payments"
  | "branches"
  | "audit"
  | "members"
  | "ai";

export type DashboardOperationalPanelProps = {
  orgId: string;
  mode: DashboardOperationalMode;
  shopView?: "products" | "orders";
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  charts: DashboardCharts;
  branchScope: BranchScopeSnapshot;
  auditLogCount: number;
  initialJoinRequests: JoinRequestRow[];
  initialNotifications: NotificationSnapshot[];
  initialProducts: ProductSnapshot[];
  initialAiUsage: AIUsageRow[];
  initialMembers?: MemberRow[];
  roles?: Role[];
  permissions?: Permission[];
};
