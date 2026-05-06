import pino from "pino";
import { redactPII } from "./utils/redact";

export type LoggerContext = {
  requestId?: string;
  userId?: string;
  orgId?: string;
};

const logger = pino({
  name: "zook",
  level: process.env.LOG_LEVEL?.trim() || "info",
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.secret",
      "*.signature",
      "*.otp",
      "*.code",
      "*.email",
      "*.phone",
      "password",
      "token",
      "secret",
      "signature",
      "otp",
      "code",
      "email",
      "phone",
    ],
    censor: "[REDACTED]",
  },
});

function withContext(context?: LoggerContext, fields?: Record<string, unknown>) {
  return redactPII({
    ...(context?.requestId ? { requestId: context.requestId } : {}),
    ...(context?.userId ? { userId: context.userId } : {}),
    ...(context?.orgId ? { orgId: context.orgId } : {}),
    ...(fields ?? {}),
  });
}

export const zookLogger = {
  info(message: string, fields?: Record<string, unknown>, context?: LoggerContext) {
    logger.info(withContext(context, fields), message);
  },
  warn(message: string, fields?: Record<string, unknown>, context?: LoggerContext) {
    logger.warn(withContext(context, fields), message);
  },
  error(message: string, fields?: Record<string, unknown>, context?: LoggerContext) {
    logger.error(withContext(context, fields), message);
  },
  child(context: LoggerContext) {
    return {
      info: (message: string, fields?: Record<string, unknown>) =>
        zookLogger.info(message, fields, context),
      warn: (message: string, fields?: Record<string, unknown>) =>
        zookLogger.warn(message, fields, context),
      error: (message: string, fields?: Record<string, unknown>) =>
        zookLogger.error(message, fields, context),
    };
  },
};
