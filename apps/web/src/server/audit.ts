import type { NextRequest } from "next/server";
import { Prisma, prisma } from "@zook/db";
import { currentRequestId } from "./request-state";

export async function writeAuditLog(input: {
  request?: NextRequest;
  orgId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const requestId = currentRequestId();
  await prisma.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      ...(input.orgId ? { orgId: input.orgId } : {}),
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      ...(requestId ? { requestId } : {}),
      ...(input.entityId ? { entityId: input.entityId } : {}),
      ...(input.request?.headers.get("x-forwarded-for")
        ? { ipAddress: input.request.headers.get("x-forwarded-for") as string }
        : {}),
      ...(input.request?.headers.get("user-agent")
        ? { userAgent: input.request.headers.get("user-agent") as string }
        : {}),
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {})
    }
  });
}
