import type { NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { writeAuditLog } from "../audit";
import { ok, readJson } from "../response";
import { clean, pathMatches, platformFlagPatchSchema } from "./core";

export async function handlePlatformFlags(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
    const defaults = [
      {
        key: "ai.assistant",
        enabled: false,
        description: "Allow AI assistant chat requests without redeploying.",
        rolloutPercent: 0,
        overrideOrgIds: [],
        updatedAt: new Date(),
        updatedByUserId: null,
      },
      {
        key: "platform.impersonation",
        enabled: false,
        description: "Allow platform admins to start audited support impersonation sessions.",
        rolloutPercent: 0,
        overrideOrgIds: [],
        updatedAt: new Date(),
        updatedByUserId: null,
      },
    ];
    const existingKeys = new Set(flags.map((flag) => flag.key));
    return ok({
      flags: [...flags, ...defaults.filter((flag) => !existingKeys.has(flag.key))],
    });
  }

  if (request.method === "PATCH" && pathMatches(path, ["platform", "flags"])) {
    const ctx = await getRequestContext(request);
    const actorUserId = requirePlatformAdmin(ctx);
    const body = platformFlagPatchSchema.parse(await readJson(request));
    const flag = await prisma.featureFlag.upsert({
      where: { key: body.key },
      create: clean({
        key: body.key,
        enabled: body.enabled ?? false,
        description: body.description,
        rolloutPercent: body.rolloutPercent ?? 0,
        overrideOrgIds: body.overrideOrgIds ?? [],
        updatedByUserId: actorUserId,
      }),
      update: clean({
        enabled: body.enabled,
        description: body.description,
        rolloutPercent: body.rolloutPercent,
        overrideOrgIds: body.overrideOrgIds,
        updatedByUserId: actorUserId,
      }),
    });
    await writeAuditLog({
      request,
      actorUserId,
      action: "platform.feature_flag_updated",
      entityType: "feature_flag",
      entityId: flag.key,
      riskLevel: flag.key === "platform.impersonation" ? "CRITICAL" : "HIGH",
      metadata: { enabled: flag.enabled, rolloutPercent: flag.rolloutPercent },
    });
    return ok({ flag });
  }

  return undefined;
}
