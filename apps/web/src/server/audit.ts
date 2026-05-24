import type { NextRequest } from "next/server";
import { redactPII } from "@zook/core";
import { Prisma, prisma } from "@zook/db";
import { createRequestContext } from "./context";
import { currentRequestId } from "./request-state";

export async function writeAuditLog(input: {
  request?: NextRequest;
  orgId?: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metadata?: Record<string, unknown>;
}) {
  const requestId = currentRequestId();
  const ctx = input.request ? await createRequestContext(input.request) : null;
  const metadata = {
    ...(input.metadata ?? {}),
    ...(ctx?.impersonationSessionId
      ? { impersonationSessionId: ctx.impersonationSessionId, originalUserId: ctx.originalUserId }
      : {}),
  };
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
      ...(input.before ? { before: redactPII(input.before) as Prisma.InputJsonValue } : {}),
      ...(input.after ? { after: redactPII(input.after) as Prisma.InputJsonValue } : {}),
      ...(input.riskLevel ? { riskLevel: input.riskLevel } : {}),
      ...(Object.keys(metadata).length
        ? { metadata: redactPII(metadata) as Prisma.InputJsonValue }
        : {}),
    },
  });
}
