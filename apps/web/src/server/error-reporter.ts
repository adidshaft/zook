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
    console.error("zook.error", {
      message: error instanceof Error ? error.message : "Unexpected error",
      ...(context ?? {})
    });
  }

  captureMessage(message: string, context?: ErrorReporterContext) {
    console.info("zook.message", {
      message,
      ...(context ?? {})
    });
  }
}

class SentryErrorReporter implements ErrorReporter {
  constructor(
    private readonly config: {
      dsn: string;
      environment: string;
    }
  ) {}

  captureException(error: unknown, context?: ErrorReporterContext) {
    console.error("zook.sentry.scaffold", {
      dsnConfigured: Boolean(this.config.dsn),
      environment: this.config.environment,
      message: error instanceof Error ? error.message : "Unexpected error",
      ...(context ?? {})
    });
  }

  captureMessage(message: string, context?: ErrorReporterContext) {
    console.info("zook.sentry.scaffold", {
      dsnConfigured: Boolean(this.config.dsn),
      environment: this.config.environment,
      message,
      ...(context ?? {})
    });
  }
}

export function getErrorReporter(): ErrorReporter {
  if (process.env.ERROR_REPORTER === "sentry" && process.env.SENTRY_DSN?.trim()) {
    return new SentryErrorReporter({
      dsn: process.env.SENTRY_DSN.trim(),
      environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.ENV_PROFILE || "local"
    });
  }
  return new MockErrorReporter();
}
