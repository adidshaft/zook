import { redactPII } from "@zook/core";
import { zookLogger } from "@zook/core";
import { captureSentryException, initSentry, isSentryEnabled } from "./sentry-shared";

type RouteErrorContext = {
  requestId?: string;
  method?: string;
  path?: string;
  userId?: string;
  orgId?: string;
  status?: number;
  metadata?: Record<string, unknown>;
};

export function captureRouteError(error: unknown, context: RouteErrorContext = {}) {
  initSentry();
  const redactedContext = redactPII(context);
  captureSentryException(error, context);
  zookLogger.error(
    isSentryEnabled() ? "zook.sentry.route_error" : "zook.route_error",
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
