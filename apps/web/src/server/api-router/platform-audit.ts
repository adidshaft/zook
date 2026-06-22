import type { NextRequest } from "next/server";
import { Prisma, prisma } from "@zook/db";
import { getRequestContext, requirePlatformAdmin } from "../access";
import { ok } from "../response";
import { clean, pageResult, parseCursorPagination, pathMatches } from "./core";

export async function handlePlatformAudit(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["platform", "audit"])) {
    const ctx = await getRequestContext(request);
    requirePlatformAdmin(ctx);
    const { limit, cursor } = parseCursorPagination(request, 100, 200);
    const orgId = request.nextUrl.searchParams.get("org") || undefined;
    const userId = request.nextUrl.searchParams.get("user") || undefined;
    const riskLevel = request.nextUrl.searchParams.get("risk") || undefined;
    const logs = await prisma.auditLog.findMany({
      where: clean({
        orgId,
        actorUserId: userId,
        riskLevel: riskLevel as Prisma.AuditLogWhereInput["riskLevel"],
      }),
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = pageResult(logs, limit);
    return ok({ auditLogs: page.items, nextCursor: page.nextCursor, limit });
  }

  return undefined;
}
