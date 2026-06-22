import type { NextRequest } from "next/server";
import { prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { getPlatformProviderDiagnostics } from "../domains/overview/read-models";
import { ok } from "../response";
import { pathMatches } from "./core";

export async function handlePlatformMonitoring(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "ai-usage"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      usage: await prisma.aIUsageLog.findMany({ take: 100, orderBy: { createdAt: "desc" } }),
    });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "provider-status"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({ providers: getPlatformProviderDiagnostics() });
  }

  if (request.method === "GET" && pathMatches(path, ["platform", "abuse-flags"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    return ok({
      flags: await prisma.organizationAbuseFlag.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    });
  }

  return undefined;
}
