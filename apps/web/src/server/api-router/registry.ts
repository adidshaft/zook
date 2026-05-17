import type { NextRequest, NextResponse } from "next/server";
import {
  handleAiNotificationsShopPrivacyPlatform,
  handleAttendance,
  handleAuth,
  handleCouponsReferrals,
  handleFiles,
  handleHealthReadiness,
  handleMeData,
  handleMembershipPayments,
  handleOrganizations,
  handleReports,
  handleStaffPlansGoals,
  handleTracking,
} from "./core";

export type ApiRouteHandler = (
  request: NextRequest,
  path: string[],
) => Promise<NextResponse | undefined>;

export const apiRouteHandlers: ApiRouteHandler[] = [
  handleHealthReadiness,
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
