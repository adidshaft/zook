import { randomBytes } from "node:crypto";
import type { OrgRole } from "@zook/core";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth, requireOrgPermission } from "../access";
import { writeAuditLog } from "../audit";
import { conflictError, forbiddenError, notFoundError, validationError } from "../errors";
import { assertRateLimit } from "../rate-limit";
import { ok, readJson } from "../response";
import {
  assertLimitAvailable,
  assertSingleRoleForOrgUser,
  clean,
  getEmailProviderOrThrow,
  getOrgSaasEntitlements,
  pathMatches,
  resolveOrgBranch,
  revokeActiveSessionsForUsers,
} from "./core";

const staffInviteSchema = z
  .object({
    email: z.string().trim().email(),
    role: z.enum(["ADMIN", "RECEPTIONIST", "TRAINER"]),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "RECEPTIONIST" && !value.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose the branch this Reception user will manage.",
        path: ["branchId"],
      });
    }
  });

const staffRoleUpdateSchema = z
  .object({
    role: z.enum(["ADMIN", "RECEPTIONIST", "TRAINER"]),
    branchId: z.string().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === "RECEPTIONIST" && !value.branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reception users must be assigned to one branch.",
        path: ["branchId"],
      });
    }
  });

export async function handleStaff(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["staff-invitations", /.+/])) {
    const token = path[1]!;
    const invite = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invite) {
      throw notFoundError("Staff invitation not found");
    }
    const organization = await prisma.organization.findUnique({ where: { id: invite.orgId } });
    return ok({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        branchId: invite.branchId,
        acceptedAt: invite.acceptedAt,
        expiresAt: invite.expiresAt,
      },
      organization,
    });
  }
  if (request.method === "POST" && pathMatches(path, ["staff-invitations", /.+/, "accept"])) {
    const token = path[1]!;
    const ctx = await getRequestContext(request);
    const userId = requireAuth(ctx);
    const invite = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invite) {
      throw notFoundError("Staff invitation not found");
    }
    if (invite.acceptedAt) {
      throw conflictError("Staff invitation has already been accepted.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw validationError("Staff invitation has expired.");
    }
    const acceptingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw forbiddenError("Sign in with the invited email address to accept this staff invite.");
    }
    const assignment = await prisma.$transaction(async (tx) => {
      await tx.organizationUser.upsert({
        where: { orgId_userId: { orgId: invite.orgId, userId } },
        update: { leftAt: null },
        create: { orgId: invite.orgId, userId },
      });
      await assertSingleRoleForOrgUser(tx, {
        orgId: invite.orgId,
        userId,
        nextRole: invite.role as OrgRole,
      });
      const roleAssignment = await tx.organizationRoleAssignment.upsert({
        where: { orgId_userId_role: { orgId: invite.orgId, userId, role: invite.role } },
        update: { assignedById: invite.invitedById, branchId: invite.branchId },
        create: {
          orgId: invite.orgId,
          userId,
          role: invite.role,
          branchId: invite.branchId,
          assignedById: invite.invitedById,
        },
      });
      await tx.staffInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedById: userId },
      });
      return roleAssignment;
    });
    await writeAuditLog({
      request,
      orgId: invite.orgId,
      actorUserId: userId,
      action: "staff.invite_accepted",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { role: invite.role },
    });
    await revokeActiveSessionsForUsers([userId]);
    return ok({ assignment });
  }
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "staff"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const staff = await prisma.organizationRoleAssignment.findMany({
      where: { orgId, role: { not: "MEMBER" } },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: staff.map((row) => row.userId) } },
    });
    return ok({ staff, users });
  }
  if (request.method === "POST" && pathMatches(path, ["orgs", /.+/, "staff", "invite"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    await assertRateLimit(
      "staffInviteByActorOrg",
      `${orgId}:${userId}`,
      "Too many staff invites from this account today.",
    );
    const body = staffInviteSchema.parse(await readJson(request));
    if (body.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: body.branchId, orgId, active: true },
        select: { id: true },
      });
      if (!branch) {
        throw validationError("Choose an active branch for this Reception user.");
      }
    }
    const inviteEmail = body.email.toLowerCase();
    const [
      { tier, entitlements },
      staffCount,
      pendingInviteCount,
      trainerCount,
      pendingTrainerInviteCount,
    ] = await Promise.all([
      getOrgSaasEntitlements(orgId),
      prisma.organizationRoleAssignment.count({ where: { orgId, role: { not: "MEMBER" } } }),
      prisma.staffInvitation.count({
        where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.organizationRoleAssignment.count({ where: { orgId, role: "TRAINER" } }),
      prisma.staffInvitation.count({
        where: { orgId, role: "TRAINER", acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    assertLimitAvailable({
      limit: entitlements.staffLimit,
      used: staffCount + pendingInviteCount,
      label: "Staff",
      tier,
    });
    if (body.role === "TRAINER") {
      assertLimitAvailable({
        limit: entitlements.trainerLimit,
        used: trainerCount + pendingTrainerInviteCount,
        label: "Trainer",
        tier,
      });
    }
    const invitedUser = await prisma.user.findFirst({
      where: { email: { equals: inviteEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (invitedUser) {
      await assertSingleRoleForOrgUser(prisma, {
        orgId,
        userId: invitedUser.id,
        nextRole: body.role,
      });
    }
    const [organization, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    const invite = await prisma.staffInvitation.create({
      data: {
        orgId,
        email: inviteEmail,
        role: body.role,
        branchId: body.role === "RECEPTIONIST" ? (body.branchId ?? null) : null,
        token: randomBytes(18).toString("base64url"),
        invitedById: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const inviteBaseUrl = (
      process.env.NEXT_PUBLIC_WEB_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      ""
    ).replace(/\/$/, "");
    await getEmailProviderOrThrow().sendStaffInviteEmail(
      clean({
        to: invite.email,
        organizationName: organization?.name ?? "Zook",
        role: invite.role,
        inviterName: inviter?.name ?? inviter?.email,
        expiresAt: invite.expiresAt,
        ...(inviteBaseUrl ? { inviteUrl: `${inviteBaseUrl}/staff/invite/${invite.token}` } : {}),
      }),
    );
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: invite.id,
      metadata: { email: body.email, role: body.role, branchId: body.branchId ?? null },
    });
    return ok({ invite });
  }
  if (request.method === "PATCH" && pathMatches(path, ["orgs", /.+/, "staff", /.+/])) {
    const orgId = path[1]!;
    const assignmentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const body = staffRoleUpdateSchema.parse(await readJson(request));
    const existingAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!existingAssignment) {
      throw notFoundError("Staff assignment not found");
    }
    if (existingAssignment.role === "OWNER") {
      throw conflictError("Owner access cannot be edited from the staff roster.");
    }
    if (body.branchId) {
      await resolveOrgBranch(orgId, body.branchId);
    }
    await assertSingleRoleForOrgUser(prisma, {
      orgId,
      userId: existingAssignment.userId,
      nextRole: body.role,
      allowAssignmentId: existingAssignment.id,
    });
    const duplicateAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: {
        orgId,
        userId: existingAssignment.userId,
        role: body.role,
        id: { not: existingAssignment.id },
      },
    });
    if (duplicateAssignment) {
      throw conflictError("This staff member already has that role.");
    }
    const assignment = await prisma.organizationRoleAssignment.update({
      where: { id: existingAssignment.id },
      data: { role: body.role, branchId: body.branchId ?? null },
    });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.role_updated",
      entityType: "organization_role_assignment",
      entityId: assignment.id,
      metadata: {
        userId: assignment.userId,
        previousRole: existingAssignment.role,
        role: assignment.role,
      },
    });
    await revokeActiveSessionsForUsers([assignment.userId]);
    return ok({ assignment });
  }
  if (request.method === "DELETE" && pathMatches(path, ["orgs", /.+/, "staff", /.+/])) {
    const orgId = path[1]!;
    const assignmentId = path[3]!;
    const ctx = await getRequestContext(request, { orgId });
    const userId = requireOrgPermission(ctx, orgId, "ORG_MANAGE_STAFF");
    const existingAssignment = await prisma.organizationRoleAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!existingAssignment) {
      throw notFoundError("Staff assignment not found");
    }
    if (existingAssignment.role === "OWNER") {
      throw conflictError("Owner access cannot be revoked from the staff roster.");
    }
    await prisma.organizationRoleAssignment.delete({ where: { id: existingAssignment.id } });
    await writeAuditLog({
      request,
      orgId,
      actorUserId: userId,
      action: "staff.revoked",
      entityType: "organization_role_assignment",
      entityId: existingAssignment.id,
      metadata: { userId: existingAssignment.userId, role: existingAssignment.role },
    });
    await revokeActiveSessionsForUsers([existingAssignment.userId]);
    return ok({ revoked: true });
  }
  return undefined;
}
