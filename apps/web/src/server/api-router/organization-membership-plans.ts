import { membershipPlanSchema } from "@zook/core";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireOrgAnyPermission, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  assertBranchAccessForContext,
  clean,
  pathMatches,
  queryBranchId,
  resolveOrgBranch,
  sanitizeRichText,
} from "./core";

export async function handleOrganizationMembershipPlans(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgAnyPermission(ctx, orgId, [
      "MEMBERSHIP_PLAN_MANAGE",
      "PAYMENTS_RECORD_OFFLINE",
      "MEMBERS_VIEW",
    ]);
    const branchId = await assertBranchAccessForContext(ctx, orgId, queryBranchId(request));
    return ok({
      plans: await prisma.membershipPlan.findMany({
        where: {
          orgId,
          ...(branchId ? { branchId } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "membership-plans"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema.parse(await readJson(request));
    const branch = await resolveOrgBranch(orgId, queryBranchId(request));
    const plan = await prisma.membershipPlan.create({
      data: clean({
        orgId,
        branchId: branch.id,
        name: body.name,
        description: sanitizeRichText(body.description),
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        createdById: userId,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.created",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, type: plan.type },
    });
    return ok({ plan });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "membership-plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const body = membershipPlanSchema
      .extend({ active: z.boolean().optional() })
      .partial()
      .parse(await readJson(request));
    const existingPlan = await prisma.membershipPlan.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Membership plan not found");
    }
    const plan = await prisma.membershipPlan.update({
      where: { id: existingPlan.id },
      data: clean({
        name: body.name,
        description: sanitizeRichText(body.description),
        type: body.type,
        pricePaise: body.pricePaise,
        durationDays: body.durationDays,
        visitLimit: body.visitLimit,
        validityDays: body.validityDays,
        publicVisible: body.publicVisible,
        active: body.active,
      }),
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.updated",
      entityType: "membership_plan",
      entityId: plan.id,
      metadata: { name: plan.name, active: plan.active, publicVisible: plan.publicVisible },
    });
    return ok({ plan });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "membership-plans", /.+/])) {
    const orgId = path[1]!;
    const planId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERSHIP_PLAN_MANAGE");
    const existingPlan = await prisma.membershipPlan.findFirst({ where: { id: planId, orgId } });
    if (!existingPlan) {
      throw notFoundError("Membership plan not found");
    }
    const usageCount = await prisma.memberSubscription.count({
      where: { orgId, planId: existingPlan.id },
    });
    if (usageCount > 0) {
      throw conflictError("This plan has subscriptions attached. Archive it instead of deleting.");
    }
    await prisma.membershipPlan.delete({ where: { id: existingPlan.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_plan.deleted",
      entityType: "membership_plan",
      entityId: existingPlan.id,
      metadata: { name: existingPlan.name },
    });
    return ok({ deleted: true });
  }
  return undefined;
}
