import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireOrgPermission } from "../access";
import { getOrganizationDashboardData } from "../domains/overview/read-models";
import { validationError } from "../errors";
import { ok } from "../response";
import {
  assertBranchAccessForContext,
  clean,
  isAllBranchesRequest,
  pathMatches,
  queryBranchId,
} from "./core";

function canViewAllBranches(ctx: Awaited<ReturnType<typeof getRequestContext>>) {
  return ctx.isPlatformAdmin || ctx.roles.some((role) => role === "OWNER" || role === "ADMIN");
}

async function getScopedDashboardPayload(request: NextRequest, orgId: string) {
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
  const requestedBranchId = queryBranchId(request);
  const branchId = await assertBranchAccessForContext(ctx, orgId, requestedBranchId);
  return getOrganizationDashboardData(
    orgId,
    clean({
      branchId,
      allBranches: isAllBranchesRequest(requestedBranchId),
      allBranchesAllowed: canViewAllBranches(ctx),
    }),
  );
}

function parseReportChartRange(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");
  if (!fromParam && !toParam) {
    return undefined;
  }
  if (!fromParam || !toParam) {
    throw validationError("Both from and to are required for report chart ranges.");
  }
  const from = new Date(`${fromParam}T00:00:00.000+05:30`);
  const to = new Date(`${toParam}T00:00:00.000+05:30`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw validationError("Report chart range must use YYYY-MM-DD dates.");
  }
  if (to < from) {
    throw validationError("Report chart range end date must be after start date.");
  }
  const days = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days > 90) {
    throw validationError("Report chart range cannot exceed 90 days.");
  }
  return { from, to };
}

async function getScopedReportSummaryPayload(request: NextRequest, orgId: string) {
  const ctx = await getRequestContext(request, { orgId });
  requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
  const requestedBranchId = queryBranchId(request);
  const branchId = await assertBranchAccessForContext(ctx, orgId, requestedBranchId);
  const chartRange = parseReportChartRange(request);
  return getOrganizationDashboardData(
    orgId,
    clean({
      branchId,
      allBranches: isAllBranchesRequest(requestedBranchId),
      allBranchesAllowed: canViewAllBranches(ctx),
    }),
    chartRange ? { chartRange } : {},
  );
}

export async function handleOrganizationOverview(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "dashboard"])) {
    return ok(await getScopedDashboardPayload(request, path[1]!));
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "setup-status"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_VIEW_REPORTS");
    const [
      membershipPlanCount,
      qrTokenCount,
      attendanceCount,
      staffCount,
      memberCount,
      shopProductCount,
    ] = await Promise.all([
      prisma.membershipPlan.count({ where: { orgId, active: true } }),
      prisma.attendanceQrToken.count({ where: { orgId } }),
      prisma.attendanceRecord.count({ where: { orgId } }),
      prisma.organizationRoleAssignment.count({
        where: { orgId, role: { in: ["OWNER", "ADMIN", "TRAINER", "RECEPTIONIST"] } },
      }),
      prisma.memberProfile.count({ where: { orgId } }),
      prisma.product.count({ where: { orgId, active: true } }),
    ]);
    return ok({
      hasMembershipPlans: membershipPlanCount > 0,
      hasQrDisplayed: qrTokenCount > 0 || attendanceCount > 0,
      staffCount,
      memberCount,
      hasShopProducts: shopProductCount > 0,
    });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "reports", "summary"])) {
    return ok(await getScopedReportSummaryPayload(request, path[1]!));
  }
  return undefined;
}
