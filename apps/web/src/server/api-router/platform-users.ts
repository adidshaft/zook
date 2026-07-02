import type { NextRequest } from "next/server";
import { z } from "zod";
import { AuthService } from "@zook/core/services";
import { prisma } from "@zook/db";
import { getRequestContext, requireAuth, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { forbiddenError, notFoundError } from "../errors";
import { getClientIp } from "../security";
import { ok, readJson } from "../response";
import { serializeUserForClient, setSessionCookie } from "./auth-helpers";
import {
  ADMIN_DETAIL_LIST_LIMIT,
  assertNotImpersonating,
  clean,
  isFeatureFlagEnabled,
  pathMatches,
  platformImpersonateSchema,
  sha256,
} from "./core";

export async function handlePlatformUsers(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "users"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const users = await prisma.user.findMany({
      where:
        query.length >= 2
          ? {
              deletedAt: null,
              OR: [
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query } },
                { name: { contains: query, mode: "insensitive" } },
              ],
            }
          : { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: query.length >= 2 ? 25 : 50,
    });
    return ok({ users: users.map(serializeUserForClient) });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "users", /.+/])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const userId = path[2]!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw notFoundError("User not found");
    }
    const [sessions, memberships, roleAssignments, orgs, payments, auditLogs] = await Promise.all([
      prisma.userSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.organizationUser.findMany({
        where: { userId },
        orderBy: { joinedAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
      prisma.organizationRoleAssignment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: ADMIN_DETAIL_LIST_LIMIT,
      }),
      prisma.organization.findMany({
        where: {
          id: {
            in: (
              await prisma.organizationUser.findMany({
                where: { userId },
                select: { orgId: true },
                take: ADMIN_DETAIL_LIST_LIMIT,
              })
            ).map((item) => item.orgId),
          },
        },
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.auditLog.findMany({
        where: { OR: [{ actorUserId: userId }, { entityId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);
    const orgById = new Map(orgs.map((org) => [org.id, org]));
    return ok({
      user: serializeUserForClient(user),
      sessions,
      organizations: memberships.map((membership) => ({
        ...membership,
        organization: orgById.get(membership.orgId) ?? null,
        roles: roleAssignments
          .filter((assignment) => assignment.orgId === membership.orgId)
          .map((assignment) => assignment.role),
      })),
      payments,
      auditLogs,
    });
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "users", /.+/, "sessions", "revoke"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Session revocation");
    const targetUserId = path[2]!;
    const body = z
      .object({ sessionId: z.string().optional() })
      .parse(await readJson(request).catch(() => ({})));
    const result = await prisma.userSession.updateMany({
      where: { userId: targetUserId, ...(body.sessionId ? { id: body.sessionId } : {}) },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.user_sessions_revoked",
      entityType: "user",
      entityId: targetUserId,
      riskLevel: "HIGH",
      metadata: { count: result.count, sessionId: body.sessionId ?? null },
    });
    return ok({ revoked: result.count });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "users", /.+/, "impersonate"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    assertNotImpersonating(ctx, "Starting impersonation");
    if (!(await isFeatureFlagEnabled("platform.impersonation"))) {
      throw forbiddenError("Platform impersonation is disabled.");
    }
    const targetUserId = path[2]!;
    const body = platformImpersonateSchema.parse(await readJson(request));
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw notFoundError("User not found");
    }
    if (targetUser.isPlatformAdmin) {
      throw forbiddenError("Platform admins cannot be impersonated.");
    }
    const expiresAt = new Date(Date.now() + body.ttlMinutes * 60 * 1000);
    const impersonation = await prisma.impersonationSession.create({
      data: {
        platformAdminUserId: actorUserId,
        targetUserId,
        targetOrgId: body.targetOrgId ?? null,
        reason: body.reason,
        expiresAt,
        ipHash: sha256(getClientIp(request)),
        userAgentHash: sha256(request.headers.get("user-agent") ?? "unknown-user-agent"),
      },
    });
    const token = AuthService.createToken();
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ipAddress = getClientIp(request);
    await prisma.userSession.create({
      data: clean({
        userId: targetUserId,
        originalUserId: actorUserId,
        impersonationSessionId: impersonation.id,
        tokenHash: AuthService.hash(token),
        expiresAt,
        userAgent,
        ipAddress,
        deviceFingerprintHash: AuthService.createDeviceFingerprint(clean({ userAgent, ipAddress })),
        lastSeenAt: new Date(),
      }),
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.impersonation_started",
      entityType: "impersonation_session",
      entityId: impersonation.id,
      riskLevel: "CRITICAL",
      metadata: { targetUserId, targetOrgId: body.targetOrgId ?? null, ttlMinutes: body.ttlMinutes },
    });
    const response = ok({ impersonation, token, expiresAt });
    setSessionCookie(response, request, token, expiresAt);
    return response;
  }

  if (
    request.method === "POST" &&
    pathMatches(path, ["platform", "impersonations", /.+/, "end"])
  ) {
    const ctx = await getRequestContext(request);
    const actorUserId = requireAuth(ctx);
    const impersonationId = path[2]!;
    const impersonation = await prisma.impersonationSession.findUnique({
      where: { id: impersonationId },
    });
    if (!impersonation) {
      throw notFoundError("Impersonation session not found");
    }
    const canEnd =
      ctx.impersonationSessionId === impersonationId ||
      (ctx.isPlatformAdmin && ctx.userId === impersonation.platformAdminUserId);
    if (!canEnd) {
      throw forbiddenError("Cannot end this impersonation session.");
    }
    const ended = await prisma.impersonationSession.update({
      where: { id: impersonationId },
      data: { endedAt: new Date() },
    });
    await prisma.userSession.updateMany({
      where: { impersonationSessionId: impersonationId },
      data: { revokedAt: new Date() },
    });
    await writeAuditLog({
      request,
      actorUserId: ctx.originalUserId ?? actorUserId,
      action: "platform.impersonation_ended",
      entityType: "impersonation_session",
      entityId: impersonationId,
      riskLevel: "HIGH",
      metadata: { targetUserId: impersonation.targetUserId },
    });
    const response = ok({ impersonation: ended });
    if (ctx.originalUserId) {
      const token = AuthService.createToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const userAgent = request.headers.get("user-agent") ?? undefined;
      const ipAddress = getClientIp(request);
      await prisma.userSession.create({
        data: clean({
          userId: ctx.originalUserId,
          tokenHash: AuthService.hash(token),
          expiresAt,
          userAgent,
          ipAddress,
          deviceFingerprintHash: AuthService.createDeviceFingerprint(clean({ userAgent, ipAddress })),
          lastSeenAt: new Date(),
        }),
      });
      setSessionCookie(response, request, token, expiresAt);
    }
    return response;
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "impersonations"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      impersonations: await prisma.impersonationSession.findMany({
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
    });
  }

  return undefined;
}
