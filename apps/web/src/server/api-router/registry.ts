import type { NextRequest, NextResponse } from "next/server";
import {
  handleAiNotificationsShopPrivacyPlatform,
  handleAttendance,
  handleAuth,
  handleCronJobs,
  handleCouponsReferrals,
  handleFiles,
  handleMeData,
  handleMembershipPayments,
  handleOrganizations,
  handleReports,
  handleStaffPlansGoals,
  handleTracking,
} from "./core";
import { handleHealthReadiness } from "./health-readiness";

export type ApiRouteHandler = (
  request: NextRequest,
  path: string[],
) => Promise<NextResponse | undefined>;

export const apiRouteHandlers: ApiRouteHandler[] = [
  handleHealthReadiness,
  handleCronJobs,
  handleAuth,
  handleMeData,
  handleTracking,
  handleFiles,
  handleOrganizations,
  handleReports,
  handleMembershipPayments,
  handleCouponsReferrals,
  handleAttendance,
  handleStaffPlansGoals,
  handleAiNotificationsShopPrivacyPlatform,
];
