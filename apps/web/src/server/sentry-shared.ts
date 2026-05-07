import * as Sentry from "@sentry/nextjs";
import { redactPII, zookLogger } from "@zook/core";

type SentryContext = {
  requestId?: string;
  method?: string;
  path?: string;
  userId?: string;
  orgId?: string;
  status?: number;
  metadata?: Record<string, unknown>;
};

let initialized = false;

function sentryDsn() {
  return process.env.SENTRY_DSN?.trim();
}

export function sentryEnvironment() {
  return process.env.SENTRY_ENVIRONMENT?.trim() || process.env.ENV_PROFILE || "local";
}

export function isSentryEnabled() {
  return process.env.ERROR_REPORTER === "sentry" && Boolean(sentryDsn());
}

export function initSentry() {
  if (initialized) {
    return;
  }
  initialized = true;

  const dsn = sentryDsn();
  if (!isSentryEnabled() || !dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0,
    beforeSend(event) {
      return redactPII(event);
    },
  });

  zookLogger.info("zook.sentry.initialized", {
    dsnConfigured: true,
    environment: sentryEnvironment(),
  });
}

export function captureSentryException(error: unknown, context: SentryContext = {}) {
  initSentry();
  if (!isSentryEnabled()) {
    return;
  }
  const redactedContext = redactPII(context);
  Sentry.captureException(error, {
    tags: {
      ...(context.method ? { method: context.method } : {}),
      ...(context.path ? { path: context.path } : {}),
      ...(context.status ? { status: String(context.status) } : {}),
    },
    user: {
      ...(context.userId ? { id: "[REDACTED]" } : {}),
    },
    extra: redactedContext,
  });
}

export function captureSentryMessage(message: string, context: SentryContext = {}) {
  initSentry();
  if (!isSentryEnabled()) {
    return;
  }
  Sentry.captureMessage(message, {
    level: "info",
    extra: redactPII(context),
  });
}
