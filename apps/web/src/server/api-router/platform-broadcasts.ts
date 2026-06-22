import type { NextRequest } from "next/server";
import type { OrgRole } from "@zook/core";
import { prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { notFoundError } from "../errors";
import { ok, readJson } from "../response";
import {
  clean,
  fanOutPlatformBroadcast,
  pathMatches,
  platformBroadcastSchema,
} from "./core";

export async function handlePlatformBroadcasts(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "broadcasts"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      broadcasts: await prisma.platformBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "broadcasts"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformBroadcastSchema.parse(await readJson(request));
    const broadcast = await prisma.platformBroadcast.create({
      data: clean({
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        publishedAt: body.status === "LIVE" ? new Date() : undefined,
        createdByUserId: actorUserId,
      }),
    });
    const fanout =
      broadcast.status === "LIVE"
        ? await fanOutPlatformBroadcast({
            broadcast: {
              id: broadcast.id,
              title: broadcast.title,
              body: broadcast.body,
              severity: broadcast.severity,
              targetOrgIds: broadcast.targetOrgIds,
              targetRoles: broadcast.targetRoles as OrgRole[],
              createdByUserId: broadcast.createdByUserId,
            },
          })
        : null;
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_created",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
      metadata: { status: broadcast.status, severity: broadcast.severity, fanout },
    });
    return ok({ broadcast, fanout });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "broadcasts", /.+/])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformBroadcastSchema.partial().parse(await readJson(request));
    const previous = await prisma.platformBroadcast.findUnique({ where: { id: path[2]! } });
    if (!previous) {
      throw notFoundError("Broadcast not found");
    }
    const broadcast = await prisma.platformBroadcast.update({
      where: { id: path[2]! },
      data: clean({
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        ...(body.status === "LIVE" ? { publishedAt: new Date() } : {}),
      }),
    });
    const fanout =
      body.status === "LIVE" && previous.status !== "LIVE"
        ? await fanOutPlatformBroadcast({
            broadcast: {
              id: broadcast.id,
              title: broadcast.title,
              body: broadcast.body,
              severity: broadcast.severity,
              targetOrgIds: broadcast.targetOrgIds,
              targetRoles: broadcast.targetRoles as OrgRole[],
              createdByUserId: broadcast.createdByUserId,
            },
          })
        : null;
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_updated",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
      metadata: { status: broadcast.status, fanout },
    });
    return ok({ broadcast, fanout });
  }

  if (request.method === "DELETE" && pathMatches(path, ["platform", "broadcasts", /.+/])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const broadcast = await prisma.platformBroadcast.delete({ where: { id: path[2]! } });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.broadcast_deleted",
      entityType: "platform_broadcast",
      entityId: broadcast.id,
    });
    return ok({ deleted: true });
  }

  return undefined;
}
