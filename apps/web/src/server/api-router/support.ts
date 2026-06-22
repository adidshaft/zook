import { publicUserEmail } from "@zook/core";
import { prisma } from "@zook/db";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestContext, requireAuth } from "../access";
import { writeAuditLog } from "../audit";
import { getErrorReporter } from "../error-reporter";
import { currentRequestId } from "../request-state";
import { ok, readJson } from "../response";
import {
  assertActiveContextOrg,
  getEmailProviderOrThrow,
  pathMatches,
} from "./core";

const supportFeedbackSchema = z.object({
  message: z.string().trim().min(10).max(2_000),
  appVersion: z.string().trim().max(80).optional(),
  role: z.string().trim().max(80).optional(),
  orgId: z.string().trim().optional(),
});

export async function handleSupport(request: NextRequest, path: string[]) {
  if (request.method === "POST" && pathMatches(path, ["support", "feedback"])) {
    const body = supportFeedbackSchema.parse(await readJson(request));
    const ctx = await getRequestContext(request, body.orgId ? { orgId: body.orgId } : {});
    const userId = requireAuth(ctx);
    assertActiveContextOrg(ctx, body.orgId);
    const role = ctx.roles[0] ?? body.role ?? "MEMBER";
    const orgId = ctx.orgId ?? body.orgId;
    const requestId = currentRequestId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });
    const metadata = {
      appVersion: body.appVersion ?? "unknown",
      role,
      orgId: orgId ?? "none",
      userId,
      requestId,
    };
    const title = `Zook app feedback from ${role}`;
    const lines = [
      body.message,
      "",
      `User: ${user?.name ?? "Unknown"} (${publicUserEmail(user?.email) ?? user?.phone ?? userId})`,
      `Role: ${role}`,
      `Organization: ${orgId ?? "none"}`,
      `App version: ${body.appVersion ?? "unknown"}`,
      `Request ID: ${requestId ?? "unknown"}`,
    ];

    getErrorReporter().captureMessage("support.feedback_submitted", {
      ...(requestId ? { requestId } : {}),
      method: request.method,
      path: request.nextUrl.pathname,
      userId,
      ...(orgId ? { orgId } : {}),
      metadata,
    });
    await getEmailProviderOrThrow().sendNotificationEmail({
      to: "support@zookfit.in",
      title,
      body: lines.join("\n"),
      ...(orgId ? { organizationName: orgId } : {}),
      variant: "generic",
    });
    await writeAuditLog({
      request,
      ...(orgId ? { orgId } : {}),
      actorUserId: userId,
      action: "support.feedback_submitted",
      entityType: "support_feedback",
      metadata: { ...metadata, message: body.message },
    });
    return ok({ submitted: true });
  }
  return undefined;
}
