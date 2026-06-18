import type { NextRequest, NextResponse } from "next/server";
import {
  handleAiNotificationsShopPrivacyPlatform,
  handleMembershipPayments,
  handleOrganizations,
  handleStaffPlansGoals,
} from "./core";
import { handleAi } from "./ai";
import { handleAttendance } from "./attendance";
import {
  buildRouteHandlerDispatchMap,
  selectRouteHandlers,
  type RouteHandlerEntry,
} from "./dispatch";
import { handleAuth } from "./auth";
import { handleClasses } from "./classes";
import { handleCouponsReferrals } from "./coupons-referrals";
import { handleCronJobs } from "./cron";
import { handleFiles } from "./files";
import { handleHealthReadiness } from "./health-readiness";
import { handleMeData } from "./me-data";
import { handleMemberPlansGoals } from "./member-plans-goals";
import { handleNotificationsInbox } from "./notifications-inbox";
import { handleOrganizationAuditLogs } from "./organization-audit-logs";
import { handleOrganizationBranches } from "./organization-branches";
import { handleOrganizationJoinRequests } from "./organization-join-requests";
import { handleOrganizationMembers } from "./organization-members";
import { handleOrganizationMembershipPlans } from "./organization-membership-plans";
import { handleOrganizationNotifications } from "./organization-notifications";
import { handleOrganizationOverview } from "./organization-overview";
import { handleOrganizationPermissions } from "./organization-permissions";
import { handleOrganizationProfile } from "./organization-profile";
import { handleOrganizationRoot } from "./organization-root";
import { handlePlatformAudit } from "./platform-audit";
import { handlePlatformBroadcasts } from "./platform-broadcasts";
import { handlePlatformMonitoring } from "./platform-monitoring";
import { handlePlatformUsers } from "./platform-users";
import { handlePrivacy } from "./privacy";
import { handlePublicOrganizations } from "./public-organizations";
import { handlePushDevices } from "./push-devices";
import { handleReports } from "./reports";
import { handleStaff } from "./staff";
import { handleProducts } from "./products";
import { handleShopOrders } from "./shop-orders";
import { handleSupport } from "./support";
import { handleTracking } from "./tracking";

export type ApiRouteHandler = (
  request: NextRequest,
  path: string[],
) => Promise<NextResponse | undefined>;

const apiRouteHandlerEntries: RouteHandlerEntry<ApiRouteHandler>[] = [
  {
    handler: handleHealthReadiness,
    firstSegments: ["health", "ready", "status", "diagnostics"],
  },
  { handler: handleAi, firstSegments: ["ai", "orgs"] },
  { handler: handleCronJobs, firstSegments: ["cron"] },
  { handler: handleAuth, firstSegments: ["auth"] },
  { handler: handleMeData, firstSegments: ["me"] },
  { handler: handleTracking, firstSegments: ["me"] },
  { handler: handleMemberPlansGoals, firstSegments: ["me"] },
  { handler: handlePushDevices, firstSegments: ["me", "push"] },
  { handler: handlePrivacy, firstSegments: ["guardian-consent", "me"] },
  { handler: handleNotificationsInbox, firstSegments: ["me"] },
  { handler: handleFiles, firstSegments: ["files"] },
  { handler: handlePublicOrganizations, firstSegments: ["orgs", "platform-referrals"] },
  { handler: handleOrganizationAuditLogs, firstSegments: ["orgs"] },
  { handler: handleOrganizationBranches, firstSegments: ["orgs"] },
  { handler: handleOrganizationJoinRequests, firstSegments: ["orgs"] },
  { handler: handleOrganizationMembers, firstSegments: ["orgs"] },
  { handler: handleOrganizationMembershipPlans, firstSegments: ["orgs"] },
  { handler: handleOrganizationNotifications, firstSegments: ["orgs"] },
  { handler: handleOrganizationProfile, firstSegments: ["orgs"] },
  { handler: handleOrganizationOverview, firstSegments: ["orgs"] },
  { handler: handleOrganizationPermissions, firstSegments: ["orgs"] },
  { handler: handleOrganizationRoot, firstSegments: ["orgs"] },
  { handler: handleOrganizations, firstSegments: ["orgs", "platform-referrals"] },
  { handler: handleReports, firstSegments: ["orgs"] },
  { handler: handleMembershipPayments, firstSegments: ["me", "orgs", "payments"] },
  { handler: handleCouponsReferrals, firstSegments: ["orgs", "r", "referrals"] },
  { handler: handleAttendance, firstSegments: ["attendance", "orgs"] },
  { handler: handleStaff, firstSegments: ["orgs", "staff-invitations"] },
  { handler: handleClasses, firstSegments: ["orgs"] },
  { handler: handleProducts, firstSegments: ["orgs"] },
  { handler: handleShopOrders, firstSegments: ["orgs", "shop"] },
  { handler: handleSupport, firstSegments: ["support"] },
  { handler: handlePlatformAudit, firstSegments: ["platform"] },
  { handler: handlePlatformBroadcasts, firstSegments: ["platform"] },
  { handler: handlePlatformMonitoring, firstSegments: ["platform"] },
  { handler: handlePlatformUsers, firstSegments: ["platform"] },
  {
    handler: handleStaffPlansGoals,
    firstSegments: ["me", "orgs", "staff-invitations"],
  },
  {
    handler: handleAiNotificationsShopPrivacyPlatform,
    firstSegments: ["me", "orgs", "platform", "shop"],
  },
];

export const apiRouteHandlers = apiRouteHandlerEntries.map((entry) => entry.handler);

const apiRouteHandlersByFirstSegment = buildRouteHandlerDispatchMap(apiRouteHandlerEntries);

export function getApiRouteHandlersForPath(path: string[]) {
  return selectRouteHandlers(path, apiRouteHandlers, apiRouteHandlersByFirstSegment);
}
