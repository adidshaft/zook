import * as Sentry from "@sentry/react-native";
import { redactPII } from "@zook/core/utils/redact";
import Constants from "expo-constants";

let initialized = false;

function readExtraValue(key: string) {
  const extra = Constants.expoConfig?.extra ?? {};
  const value = extra[key];
  return typeof value === "string" ? value.trim() : "";
}

export function initMobileSentry() {
  if (initialized) {
    return;
  }
  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || readExtraValue("sentryDsn");
  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: readExtraValue("releaseProfile") || "local",
    enableAutoSessionTracking: true,
    beforeSend(event) {
      return redactPII(event);
    },
  });
}

export function captureMobileException(error: unknown, context?: Record<string, unknown>) {
  initMobileSentry();
  Sentry.captureException(error, context ? { extra: redactPII(context) } : undefined);
}

export { Sentry };
