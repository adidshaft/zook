import { getAppEnv } from "@zook/core";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformAdmin, getRequestContext } from "../access";
import { getErrorReporter } from "../error-reporter";
import { forbiddenError } from "../errors";
import { getHealthPayload, getReadinessPayload, getStatusPayload } from "../readiness";
import { ok, readJson } from "../response";

function pathMatches(path: string[], pattern: Array<string | RegExp>) {
  if (path.length !== pattern.length) {
    return false;
  }
  return pattern.every((part, index) =>
    typeof part === "string" ? part === path[index] : part.test(path[index] ?? ""),
  );
}

const diagnosticsThrowSchema = z.object({
  mode: z.enum(["handled", "unhandled"]).default("handled"),
});

export async function handleHealthReadiness(request: NextRequest, path: string[]) {
  if (request.method === "GET" && pathMatches(path, ["health"])) {
    return ok(getHealthPayload());
  }

  if (request.method === "GET" && pathMatches(path, ["ready"])) {
    const readiness = await getReadinessPayload();
    return ok(readiness, { status: readiness.ready ? 200 : 503 });
  }

  if (request.method === "GET" && pathMatches(path, ["status"])) {
    const statusPayload = await getStatusPayload();
    return NextResponse.json(statusPayload, {
      status: statusPayload.status === "down" ? 503 : 200,
    });
  }

  if (request.method === "POST" && pathMatches(path, ["diagnostics", "throw"])) {
    if (getAppEnv() !== "staging") {
      throw forbiddenError("Diagnostics throw is available only when APP_ENV=staging.");
    }
    const ctx = await getRequestContext(request);
    const userId = requirePlatformAdmin(ctx);
    const body = diagnosticsThrowSchema.parse(await readJson(request).catch(() => ({})));
    const error = new Error("Zook diagnostics throw test");
    if (body.mode === "handled") {
      getErrorReporter().captureException(error, {
        method: request.method,
        path: request.nextUrl.pathname,
        userId,
        metadata: {
          email: "diagnostics-redaction@example.com",
          phone: "+919999999999",
          mode: body.mode,
        },
      });
      return ok({ captured: true, mode: body.mode });
    }
    throw error;
  }

  return undefined;
}
