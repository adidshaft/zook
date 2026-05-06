import { type Permission, type Role } from "@zook/core";
import {
  type AIUsageRow,
  type BranchScopeSnapshot,
  type JoinRequestRow,
  type NotificationSnapshot,
  type OrganizationSnapshot,
  type OrganizationSummary,
  type ProductSnapshot,
} from "../../dashboard-operational-model";

export type DashboardOperationalPanelProps = {
  orgId: string;
  sectionKey: string;
  organization: OrganizationSnapshot;
  summary: OrganizationSummary;
  branchScope: BranchScopeSnapshot;
  auditLogCount: number;
  initialJoinRequests: JoinRequestRow[];
  initialNotifications: NotificationSnapshot[];
  initialProducts: ProductSnapshot[];
  initialAiUsage: AIUsageRow[];
  roles?: Role[];
  permissions?: Permission[];
};
