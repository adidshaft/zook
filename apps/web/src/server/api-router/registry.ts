import type { NextRequest, NextResponse } from "next/server";
import {
  handleAiNotificationsShopPrivacyPlatform,
  handleAttendance,
  handleAuth,
  handleCronJobs,
  handleCouponsReferrals,
  handleMeData,
  handleMembershipPayments,
  handleOrganizations,
  handleStaffPlansGoals,
} from "./core";
import {
  buildRouteHandlerDispatchMap,
  selectRouteHandlers,
  type RouteHandlerEntry,
} from "./dispatch";
import { handleFiles } from "./files";
import { handleHealthReadiness } from "./health-readiness";
import { handleReports } from "./reports";
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
  { handler: handleCronJobs, firstSegments: ["cron"] },
  { handler: handleAuth, firstSegments: ["auth"] },
  { handler: handleMeData, firstSegments: ["me"] },
  { handler: handleTracking, firstSegments: ["me"] },
  { handler: handleFiles, firstSegments: ["files"] },
  { handler: handleOrganizations, firstSegments: ["orgs", "platform-referrals"] },
  { handler: handleReports, firstSegments: ["orgs"] },
  { handler: handleMembershipPayments, firstSegments: ["me", "orgs", "payments"] },
  { handler: handleCouponsReferrals, firstSegments: ["orgs", "r", "referrals"] },
  { handler: handleAttendance, firstSegments: ["attendance", "orgs"] },
  {
    handler: handleStaffPlansGoals,
    firstSegments: ["me", "orgs", "staff-invitations"],
  },
  {
    handler: handleAiNotificationsShopPrivacyPlatform,
    firstSegments: ["ai", "guardian-consent", "me", "orgs", "platform", "push", "shop", "support"],
  },
];

export const apiRouteHandlers = apiRouteHandlerEntries.map((entry) => entry.handler);

const apiRouteHandlersByFirstSegment = buildRouteHandlerDispatchMap(apiRouteHandlerEntries);

export function getApiRouteHandlersForPath(path: string[]) {
  return selectRouteHandlers(path, apiRouteHandlers, apiRouteHandlersByFirstSegment);
}
