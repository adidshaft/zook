import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireOrgPermission } from "../access";
import { getOrganizationDashboardData } from "../domains/overview/read-models";
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
    return ok(await getScopedDashboardPayload(request, path[1]!));
  }
  return undefined;
}
