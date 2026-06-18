import type { NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { ok, readJson } from "../response";
import { pathMatches, platformModerationDecisionSchema } from "./core";

export async function handlePlatformModeration(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "moderation"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      flags: await prisma.contentModerationFlag.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    });
  }

  if (request.method === "POST" && pathMatches(path, ["platform", "moderation"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformModerationDecisionSchema.parse(await readJson(request));
    const flag = await prisma.contentModerationFlag.update({
      where: { id: body.id },
      data: {
        status: body.decision,
        reason: body.reason,
        reviewedByUserId: actorUserId,
        reviewedAt: new Date(),
      },
    });
    await writeAuditLog({
      request,
      orgId: flag.orgId,
      actorUserId,
      action: "platform.moderation_decided",
      entityType: "content_moderation_flag",
      entityId: flag.id,
      riskLevel: body.decision === "REMOVED" ? "HIGH" : "MEDIUM",
      metadata: { decision: body.decision, reason: body.reason },
    });
    return ok({ flag });
  }
}
