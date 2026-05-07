import { redactPII, zookLogger } from "@zook/core";
import {
  captureSentryException,
  captureSentryMessage,
  sentryEnvironment,
} from "./sentry-shared";

type ErrorReporterContext = {
  requestId?: string;
  method?: string;
  path?: string;
  userId?: string;
  orgId?: string;
  status?: number;
  metadata?: Record<string, unknown>;
};

export interface ErrorReporter {
  captureException(error: unknown, context?: ErrorReporterContext): void;
  captureMessage(message: string, context?: ErrorReporterContext): void;
}

class MockErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: ErrorReporterContext) {
    zookLogger.error("zook.error", {
      message: error instanceof Error ? error.message : "Unexpected error",
      ...redactPII(context ?? {}),
    });
  }

  captureMessage(message: string, context?: ErrorReporterContext) {
    zookLogger.info("zook.message", {
      message,
      ...redactPII(context ?? {}),
    });
  }
}

class SentryErrorReporter implements ErrorReporter {
  captureException(error: unknown, context?: ErrorReporterContext) {
    captureSentryException(error, context ?? {});
    zookLogger.error("zook.sentry.exception", {
      environment: sentryEnvironment(),
      message: error instanceof Error ? error.message : "Unexpected error",
      ...redactPII(context ?? {}),
    });
  }

  captureMessage(message: string, context?: ErrorReporterContext) {
    captureSentryMessage(message, context ?? {});
    zookLogger.info("zook.sentry.message", {
      environment: sentryEnvironment(),
      message,
      ...redactPII(context ?? {}),
    });
  }
}

export function getErrorReporter(): ErrorReporter {
  if (process.env.ERROR_REPORTER === "sentry" && process.env.SENTRY_DSN?.trim()) {
    return new SentryErrorReporter();
  }
  return new MockErrorReporter();
}
