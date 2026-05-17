import type { NextRequest } from "next/server";
import { toErrorResponse } from "../errors";
import { fail } from "../response";
import { getErrorReporter } from "../error-reporter";
import { logApiRequest } from "../request-logger";
import { createRequestId, runWithRequestState } from "../request-state";
import { assertSafeMutationRequest } from "../security";
import { assertServerRuntimeConfig, withIdempotency } from "./core";
import { apiRouteHandlers } from "./registry";

function apiLogMeta(path: string[]) {
  return path[0] === "orgs" && path[1] ? { orgId: path[1] } : {};
}

export async function handleApi(request: NextRequest, rawPath: string[] = []) {
  const requestId = request.headers.get("x-request-id") ?? createRequestId();
  const startedAt = Date.now();
  const errorReporter = getErrorReporter();

  return runWithRequestState({ requestId }, async () => {
    try {
      assertSafeMutationRequest(request);
      const path = rawPath.filter(Boolean);
      assertServerRuntimeConfig(path);
      return await withIdempotency(request, path, async () => {
        for (const handler of apiRouteHandlers) {
          const response = await handler(request, path);
          if (response) {
            response.headers.set("x-request-id", requestId);
            logApiRequest({
              requestId,
              method: request.method,
              path: `/${path.join("/")}`,
              status: response.status,
              durationMs: Date.now() - startedAt,
              ...apiLogMeta(path),
            });
            return response;
          }
        }

        const response = fail("not_found", `No API route matched /api/${path.join("/")}`, 404);
        response.headers.set("x-request-id", requestId);
        logApiRequest({
          requestId,
          method: request.method,
          path: `/${path.join("/")}`,
          status: response.status,
          durationMs: Date.now() - startedAt,
          ...apiLogMeta(path),
        });
        return response;
      });
    } catch (error) {
      errorReporter.captureException(error, {
        requestId,
        method: request.method,
        path: `/${rawPath.join("/")}`,
        ...apiLogMeta(rawPath),
      });
      const response = toErrorResponse(error);
      response.headers.set("x-request-id", requestId);
      logApiRequest({
        requestId,
        method: request.method,
        path: `/${rawPath.join("/")}`,
        status: response.status,
        durationMs: Date.now() - startedAt,
        providerError: error instanceof Error ? error.message : "Unexpected error",
        ...apiLogMeta(rawPath),
      });
      return response;
    }
  });
}
