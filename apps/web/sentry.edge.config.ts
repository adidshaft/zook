import * as Sentry from "@sentry/nextjs";
import { redactPII } from "@zook/core";

const dsn = process.env.SENTRY_DSN?.trim();

if (process.env.ERROR_REPORTER === "sentry" && dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.ENV_PROFILE || "local",
    tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.SENTRY_TRACES_SAMPLE_RATE)
      : 0,
    beforeSend(event) {
      return redactPII(event);
    },
  });
}
