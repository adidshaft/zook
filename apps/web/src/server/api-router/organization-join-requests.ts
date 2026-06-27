import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertSaasMemberCapacity,
  assertSaasMemberCapacityForUsers,
  clean,
  createDirectNotification,
  pathMatches,
  resolveOrgBranch,
  resolveValidatedReferral,
} from "./core";

const joinRequestSchema = z.object({
  planId: z.string().optional(),
  referralCode: z.string().trim().toUpperCase().optional(),
  message: z.string().max(500).optional(),
});

const joinRequestBatchApproveSchema = z.object({
  joinRequestIds: z.array(z.string().min(1)).min(1).max(100),
});

export async function handleOrganizationJoinRequests(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const orgId = path[1]!;
    await assertRateLimit(
      "joinRequestByActorOrg",
      `${orgId}:${userId}`,
      "Too many join requests for this gym today.",
    );
    const body = joinRequestSchema.parse(await readJson(request));
    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization || organization.visibility === "HIDDEN") {
      throw notFoundError("Gym not found");
    }
    if (organization.joinMode === "OPEN_JOIN") {
      throw conflictError("This gym supports direct join. Choose a plan and continue to payment.");
    }
    if (organization.joinMode === "INVITE_ONLY" && !body.referralCode) {
      throw forbiddenError("Invite-only gyms require a valid referral or invite code.");
    }
    if (body.planId) {
      const plan = await prisma.membershipPlan.findFirst({ where: { id: body.planId, orgId } });
      if (!plan) {
        throw notFoundError("Membership plan not found");
      }
    }
    const defaultBranch = await resolveOrgBranch(orgId);
    await resolveValidatedReferral({
      orgId,
      userId,
      ...(body.referralCode ? { referralCode: body.referralCode } : {}),
    });
    const [existingPending, existingSubscription] = await Promise.all([
      prisma.membershipJoinRequest.findFirst({
        where: { orgId, userId, status: { in: ["pending", "approved"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberSubscription.findFirst({
        where: { orgId, memberUserId: userId, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    if (existingPending) {
      throw conflictError("You already have a join request in progress for this gym.");
    }
    if (existingSubscription) {
      throw conflictError("You already have a membership in progress for this gym.");
    }
    const requestRow = await prisma.membershipJoinRequest.create({
      data: clean({
        orgId,
        branchId: defaultBranch.id,
        userId,
        planId: body.planId,
        referralCode: body.referralCode,
        message: body.message,
      }),
    });
    const ownerRecipients = await prisma.organizationRoleAssignment.findMany({
      where: { orgId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
      distinct: ["userId"],
    });
    if (ownerRecipients.length) {
      await createDirectNotification({
        orgId,
        type: "OPERATIONAL",
        title: "New member approval needed",
        body: "A member is waiting for approval to join your gym.",
        audience: "owners",
        userIds: ownerRecipients.map((recipient) => recipient.userId),
        metadata: {
          joinRequestId: requestRow.id,
          actionUrl: `/owner/approvals?highlight=${requestRow.id}`,
        },
        pushEnabled: true,
      });
    }
    return ok({ joinRequest: requestRow });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "join-requests"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    return ok({
      joinRequests: await prisma.membershipJoinRequest.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", "approve-batch"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const body = joinRequestBatchApproveSchema.parse(await readJson(request));
    const joinRequestIds = Array.from(new Set(body.joinRequestIds));
    const existingJoinRequests = await prisma.membershipJoinRequest.findMany({
      where: { id: { in: joinRequestIds }, orgId, status: "pending" },
    });
    if (!existingJoinRequests.length) {
      throw notFoundError("No pending join requests found");
    }
    await assertSaasMemberCapacityForUsers(
      orgId,
      existingJoinRequests.map((joinRequest) => joinRequest.userId),
    );
    await prisma.membershipJoinRequest.updateMany({
      where: { id: { in: existingJoinRequests.map((joinRequest) => joinRequest.id) }, orgId },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() },
    });
    const joinRequests = await prisma.membershipJoinRequest.findMany({
      where: { id: { in: existingJoinRequests.map((joinRequest) => joinRequest.id) }, orgId },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request approved",
      body: "You can now continue to payment and activate your membership in Zook.",
      audience: "selected_member",
      userIds: joinRequests.map((joinRequest) => joinRequest.userId),
      metadata: { joinRequestIds: joinRequests.map((joinRequest) => joinRequest.id), orgId },
    });
    await Promise.all(
      joinRequests.map((joinRequest) =>
        writeAuditLog({
          request,
          orgId,
          actorUserId: userId,
          action: "membership_join_request.approved",
          entityType: "membership_join_request",
          entityId: joinRequest.id,
        }),
      ),
    );
    return ok({ joinRequests });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "approve"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    await assertSaasMemberCapacity(orgId, existingJoinRequest.userId);
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "approved", reviewedById: userId, reviewedAt: new Date() },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request approved",
      body: "You can now continue to payment and activate your membership in Zook.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.approved",
      entityType: "membership_join_request",
      entityId: joinRequest.id,
    });
    return ok({ joinRequest });
  }
  if (
    request.method === "POST" &&
    pathMatches(path, ["orgs", /.+/, "join-requests", /.+/, "reject"])
  ) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "MEMBERS_MANAGE");
    const existingJoinRequest = await prisma.membershipJoinRequest.findFirst({
      where: { id: path[3]!, orgId },
    });
    if (!existingJoinRequest) {
      throw notFoundError("Join request not found");
    }
    const joinRequest = await prisma.membershipJoinRequest.update({
      where: { id: existingJoinRequest.id },
      data: { status: "rejected", reviewedById: userId, reviewedAt: new Date() },
    });
    await createDirectNotification({
      orgId,
      createdById: userId,
      type: "TRANSACTIONAL",
      title: "Membership request rejected",
      body: "Your join request was not approved. Contact the gym for the next step.",
      audience: "selected_member",
      userIds: [joinRequest.userId],
      metadata: { joinRequestId: joinRequest.id, orgId },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "membership_join_request.rejected",
      entityType: "membership_join_request",
      entityId: joinRequest.id,
    });
    return ok({ joinRequest });
  }
  return undefined;
}
