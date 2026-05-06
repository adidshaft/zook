import { redactPII } from "@zook/core";
import { zookLogger } from "@zook/core";

type RouteErrorContext = {
  requestId?: string;
  method?: string;
  path?: string;
  userId?: string;
  orgId?: string;
  status?: number;
  metadata?: Record<string, unknown>;
};

let initialized = false;

export function initSentry() {
  if (initialized) {
    return;
  }
  initialized = true;
  if (process.env.ERROR_REPORTER === "sentry" && process.env.SENTRY_DSN?.trim()) {
    zookLogger.info("zook.sentry.initialized", {
      dsnConfigured: true,
      environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.ENV_PROFILE || "local",
    });
  }
}

export function captureRouteError(error: unknown, context: RouteErrorContext = {}) {
  initSentry();
  const redactedContext = redactPII(context);
  zookLogger.error(
    process.env.ERROR_REPORTER === "sentry" && process.env.SENTRY_DSN?.trim()
      ? "zook.sentry.route_error"
      : "zook.route_error",
    {
      message: error instanceof Error ? error.message : "Unexpected error",
      ...(process.env.NODE_ENV === "development" && error instanceof Error && error.stack
        ? { stack: error.stack }
        : {}),
      ...redactedContext,
    },
    {
      ...(context.requestId ? { requestId: context.requestId } : {}),
      ...(context.userId ? { userId: context.userId } : {}),
      ...(context.orgId ? { orgId: context.orgId } : {}),
    },
  );
}
