"use client";

import * as Sentry from "@sentry/nextjs";
import { redactPII } from "@zook/core";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      process.env.NEXT_PUBLIC_ENV_PROFILE ||
      "local",
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
      ? Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE)
      : 0,
    beforeSend(event) {
      return redactPII(event);
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
