import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";

import { getRequestContext, requireOrgPermission } from "../access";
import { ok } from "../response";
import { pageResult, parseCursorPagination, pathMatches } from "./core";

async function listOrganizationAuditLogsPage(orgId: string, request: NextRequest) {
  const { limit, cursor } = parseCursorPagination(request, 100, 200);
  const logs = await prisma.auditLog.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = pageResult(logs, limit);
  return { auditLogs: page.items, nextCursor: page.nextCursor, limit };
}

export async function handleOrganizationAuditLogs(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["orgs", /.+/, "audit-logs"])) {
    const orgId = path[1]!;
    const ctx = await getRequestContext(request, { orgId });
    requireOrgPermission(ctx, orgId, "PRIVACY_VIEW_AUDIT");
    return ok(await listOrganizationAuditLogsPage(orgId, request));
  }
  return undefined;
}
