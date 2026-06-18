import type { NextRequest, NextResponse } from "next/server";
import { handleStaffPlansGoals } from "./core";
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
import { handleManualPayments } from "./manual-payments";
import { handleMeData } from "./me-data";
import { handleMemberMemberships } from "./member-memberships";
import { handleMemberPlansGoals } from "./member-plans-goals";
import { handleMembershipPayments } from "./membership-payments";
import { handleMembershipSubscriptionActions } from "./membership-subscription-actions";
import { handleNotificationsInbox } from "./notifications-inbox";
import { handleOrganizationAuditLogs } from "./organization-audit-logs";
import { handleOrganizationBilling } from "./organization-billing";
import { handleOrganizationBranches } from "./organization-branches";
import { handleOrganizationJoinRequests } from "./organization-join-requests";
import { handleOrganizationMembers } from "./organization-members";
import { handleOrganizationMembershipPlans } from "./organization-membership-plans";
import { handleOrganizationNotifications } from "./organization-notifications";
import { handleOrganizationOverview } from "./organization-overview";
import { handleOrganizationPayments } from "./organization-payments";
import { handleOrganizationPermissions } from "./organization-permissions";
import { handleOrganizationProfile } from "./organization-profile";
import { handleOrganizationRoot } from "./organization-root";
import { handlePaymentSessions } from "./payment-sessions";
import { handlePlatformAudit } from "./platform-audit";
import { handlePlatformBroadcasts } from "./platform-broadcasts";
import { handlePlatformFlags } from "./platform-flags";
import { handlePlatformModeration } from "./platform-moderation";
import { handlePlatformMonitoring } from "./platform-monitoring";
import { handlePlatformOrgAdmin } from "./platform-org-admin";
import { handlePlatformPayments } from "./platform-payments";
import { handlePlatformSettings } from "./platform-settings";
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
import { handleTrainerOperations } from "./trainer-operations";

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
  { handler: handleMemberMemberships, firstSegments: ["me"] },
  { handler: handlePushDevices, firstSegments: ["me", "push"] },
  { handler: handlePrivacy, firstSegments: ["guardian-consent", "me"] },
  { handler: handleNotificationsInbox, firstSegments: ["me"] },
  { handler: handleFiles, firstSegments: ["files"] },
  { handler: handlePublicOrganizations, firstSegments: ["orgs", "platform-referrals"] },
  { handler: handleOrganizationAuditLogs, firstSegments: ["orgs"] },
  { handler: handleOrganizationBilling, firstSegments: ["orgs"] },
  { handler: handleOrganizationBranches, firstSegments: ["orgs"] },
  { handler: handleOrganizationJoinRequests, firstSegments: ["orgs"] },
  { handler: handleOrganizationMembers, firstSegments: ["orgs"] },
  { handler: handleOrganizationMembershipPlans, firstSegments: ["orgs"] },
  { handler: handleOrganizationNotifications, firstSegments: ["orgs"] },
  { handler: handleOrganizationProfile, firstSegments: ["orgs"] },
  { handler: handleOrganizationOverview, firstSegments: ["orgs"] },
  { handler: handleOrganizationPayments, firstSegments: ["orgs"] },
  { handler: handleOrganizationPermissions, firstSegments: ["orgs"] },
  { handler: handleOrganizationRoot, firstSegments: ["orgs"] },
  { handler: handleReports, firstSegments: ["orgs"] },
  { handler: handlePaymentSessions, firstSegments: ["payments"] },
  { handler: handleMembershipSubscriptionActions, firstSegments: ["me", "orgs"] },
  { handler: handleMembershipPayments, firstSegments: ["me", "orgs"] },
  { handler: handleCouponsReferrals, firstSegments: ["orgs", "r", "referrals"] },
  { handler: handleAttendance, firstSegments: ["attendance", "orgs"] },
  { handler: handleStaff, firstSegments: ["orgs", "staff-invitations"] },
  { handler: handleManualPayments, firstSegments: ["orgs"] },
  { handler: handleTrainerOperations, firstSegments: ["orgs"] },
  { handler: handleClasses, firstSegments: ["orgs"] },
  { handler: handleProducts, firstSegments: ["orgs"] },
  { handler: handleShopOrders, firstSegments: ["orgs", "shop"] },
  { handler: handleSupport, firstSegments: ["support"] },
  { handler: handlePlatformAudit, firstSegments: ["platform"] },
  { handler: handlePlatformBroadcasts, firstSegments: ["platform"] },
  { handler: handlePlatformFlags, firstSegments: ["platform"] },
  { handler: handlePlatformModeration, firstSegments: ["platform"] },
  { handler: handlePlatformMonitoring, firstSegments: ["platform"] },
  { handler: handlePlatformOrgAdmin, firstSegments: ["platform"] },
  { handler: handlePlatformPayments, firstSegments: ["platform"] },
  { handler: handlePlatformSettings, firstSegments: ["platform"] },
  { handler: handlePlatformUsers, firstSegments: ["platform"] },
  {
    handler: handleStaffPlansGoals,
    firstSegments: ["me", "orgs", "staff-invitations"],
  },
];

export const apiRouteHandlers = apiRouteHandlerEntries.map((entry) => entry.handler);

const apiRouteHandlersByFirstSegment = buildRouteHandlerDispatchMap(apiRouteHandlerEntries);

export function getApiRouteHandlersForPath(path: string[]) {
  return selectRouteHandlers(path, apiRouteHandlers, apiRouteHandlersByFirstSegment);
}
