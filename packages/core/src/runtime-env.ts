export type AppEnv = "local" | "staging" | "production";
export type ApiMode = "backend" | "offline-demo";
export type RuntimeIssueLevel = "error" | "warning";

export interface RuntimeValidationIssue {
  level: RuntimeIssueLevel;
  code: string;
  message: string;
}

export interface RuntimeValidationResult {
  appEnv: AppEnv;
  apiMode: ApiMode;
  issues: RuntimeValidationIssue[];
}

export class RuntimeConfigError extends Error {
  readonly issues: RuntimeValidationIssue[];

  constructor(issues: RuntimeValidationIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "RuntimeConfigError";
    this.issues = issues;
  }
}

function normalizeAppEnv(value?: string | null): AppEnv | undefined {
  switch (value?.trim().toLowerCase()) {
    case "local":
    case "development":
    case "dev":
      return "local";
    case "staging":
    case "stage":
    case "preview":
      return "staging";
    case "production":
    case "prod":
      return "production";
    default:
      return undefined;
  }
}

function normalizeApiMode(value?: string | null): ApiMode | undefined {
  switch (value?.trim().toLowerCase()) {
    case "backend":
    case "api":
    case "server":
      return "backend";
    case "offline-demo":
    case "offline_demo":
    case "demo":
      return "offline-demo";
    default:
      return undefined;
  }
}

function readFirstExplicit(env: NodeJS.ProcessEnv, keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return { key, value };
    }
  }
  return undefined;
}

function invalidValueIssue(input: { key: string; value: string; supported: string[] }): RuntimeValidationIssue {
  return {
    level: "error",
    code: `INVALID_${input.key}`,
    message: `${input.key}=${input.value} is not supported. Use one of: ${input.supported.join(", ")}.`,
  };
}

export function getAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const explicit = readFirstExplicit(env, ["APP_ENV", "ENV_PROFILE", "EXPO_PUBLIC_APP_ENV"]);
  if (!explicit) {
    return "local";
  }
  const normalized = normalizeAppEnv(explicit.value);
  if (!normalized) {
    throw new RuntimeConfigError([
      invalidValueIssue({
        key: explicit.key,
        value: explicit.value,
        supported: ["local", "staging", "production"],
      }),
    ]);
  }
  return normalized;
}

export function getApiMode(env: NodeJS.ProcessEnv = process.env): ApiMode {
  const explicit = readFirstExplicit(env, ["API_MODE", "EXPO_PUBLIC_API_MODE"]);
  if (!explicit) {
    return "backend";
  }
  const normalized = normalizeApiMode(explicit.value);
  if (!normalized) {
    throw new RuntimeConfigError([
      invalidValueIssue({
        key: explicit.key,
        value: explicit.value,
        supported: ["backend", "offline-demo"],
      }),
    ]);
  }
  return normalized;
}

export function isTruthy(value?: string | null) {
  return /^(1|true|yes|on)$/i.test(value ?? "");
}

export function isFixedOtpAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") {
    return true;
  }

  const appEnv = getAppEnv(env);
  if (appEnv === "production") {
    return false;
  }
  if (appEnv === "staging") {
    return isTruthy(env.ALLOW_FIXED_OTP_IN_STAGING);
  }
  return true;
}

export function getAllowedFixedOtp(env: NodeJS.ProcessEnv = process.env) {
  const fixedOtp = env.OTP_FIXED_CODE_DEV?.trim();
  return fixedOtp && isFixedOtpAllowed(env) ? fixedOtp : undefined;
}

export function getConfiguredFixedOtp(env: NodeJS.ProcessEnv = process.env) {
  return env.OTP_FIXED_CODE_DEV?.trim() || undefined;
}

function isStrongSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 32) {
    return false;
  }
  if (/^(dev|test|local|secret|password|changeme|zook)[-_]?(secret|password)?$/i.test(trimmed)) {
    return false;
  }
  return new Set(trimmed).size >= 12;
}

export function getQrSigningSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.ZOOK_QR_SECRET?.trim();
  if (secret && isStrongSecret(secret)) {
    return secret;
  }

  const appEnv = getAppEnv(env);
  if (appEnv === "local" && secret) {
    return secret;
  }

  throw new RuntimeConfigError([
    {
      level: "error",
      code: "ZOOK_QR_SECRET_REQUIRED",
      message: "ZOOK_QR_SECRET must be a strong 32+ character secret outside local environments.",
    },
  ]);
}

export function canReturnDevOtp(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") {
    return true;
  }
  return getAppEnv(env) === "local" && isTruthy(env.ALLOW_DEV_OTP_RESPONSE);
}

export function getCronSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.CRON_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (getAppEnv(env) === "local") {
    return undefined;
  }

  throw new RuntimeConfigError([
    {
      level: "error",
      code: "CRON_SECRET_REQUIRED",
      message: "CRON_SECRET must be configured outside local environments.",
    },
  ]);
}

export function isMockPaymentCompletionAllowed(env: NodeJS.ProcessEnv = process.env) {
  if ((env.PAYMENT_PROVIDER?.trim() || "mock") !== "mock") {
    return false;
  }

  const appEnv = getAppEnv(env);
  if (appEnv === "production") {
    return false;
  }
  if (appEnv === "staging") {
    return isTruthy(env.ALLOW_MOCK_PAYMENT_COMPLETION);
  }
  return true;
}

function normalizedProvider(env: NodeJS.ProcessEnv, key: string, defaultValue: string) {
  return env[key]?.trim().toLowerCase() || defaultValue;
}

export function validateRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeValidationResult {
  const issues: RuntimeValidationIssue[] = [];
  let appEnv: AppEnv = "local";
  let apiMode: ApiMode = "backend";

  try {
    appEnv = getAppEnv(env);
  } catch (error) {
    if (error instanceof RuntimeConfigError) {
      issues.push(...error.issues);
    } else {
      issues.push({ level: "error", code: "INVALID_APP_ENV", message: "Unable to resolve APP_ENV." });
    }
  }

  try {
    apiMode = getApiMode(env);
  } catch (error) {
    if (error instanceof RuntimeConfigError) {
      issues.push(...error.issues);
    } else {
      issues.push({ level: "error", code: "INVALID_API_MODE", message: "Unable to resolve connection mode." });
    }
  }

  if (apiMode === "offline-demo" && appEnv !== "local") {
    issues.push({
      level: "error",
      code: "OFFLINE_DEMO_NON_LOCAL",
      message: "Sample mode is only available in local builds.",
    });
  }

  if (appEnv !== "local") {
    try {
      getQrSigningSecret(env);
    } catch (error) {
      if (error instanceof RuntimeConfigError) {
        issues.push(...error.issues);
      } else {
        issues.push({
          level: "error",
          code: "ZOOK_QR_SECRET_REQUIRED",
          message: "ZOOK_QR_SECRET must be configured outside local environments.",
        });
      }
    }

    try {
      getCronSecret(env);
    } catch (error) {
      if (error instanceof RuntimeConfigError) {
        issues.push(...error.issues);
      } else {
        issues.push({
          level: "error",
          code: "CRON_SECRET_REQUIRED",
          message: "CRON_SECRET must be configured outside local environments.",
        });
      }
    }
  }

  if (appEnv === "production") {
    if (env.OTP_FIXED_CODE_DEV?.trim()) {
      issues.push({
        level: "error",
        code: "PRODUCTION_FIXED_OTP",
        message: "OTP_FIXED_CODE_DEV must be unset in production.",
      });
    }
    if (isTruthy(env.ALLOW_MOCK_PAYMENT_COMPLETION)) {
      issues.push({
        level: "error",
        code: "PRODUCTION_MOCK_PAYMENT_COMPLETION",
        message: "ALLOW_MOCK_PAYMENT_COMPLETION must be unset in production.",
      });
    }
    if (normalizedProvider(env, "PAYMENT_PROVIDER", "mock") === "mock") {
      issues.push({
        level: "error",
        code: "PRODUCTION_MOCK_PAYMENT_PROVIDER",
        message: "PAYMENT_PROVIDER=mock is not allowed in production. Use razorpay or disabled.",
      });
    }
    if (normalizedProvider(env, "AI_PROVIDER", "mock") === "mock") {
      issues.push({
        level: "error",
        code: "PRODUCTION_MOCK_AI_PROVIDER",
        message: "AI_PROVIDER=mock is not allowed in production. Use openai or disabled.",
      });
    }
    if (normalizedProvider(env, "PUSH_PROVIDER", "mock") === "mock") {
      issues.push({
        level: "error",
        code: "PRODUCTION_MOCK_PUSH_PROVIDER",
        message: "PUSH_PROVIDER=mock is not allowed in production. Use expo or disabled.",
      });
    }
    if (normalizedProvider(env, "WHATSAPP_PROVIDER", "disabled") === "mock") {
      issues.push({
        level: "error",
        code: "PRODUCTION_MOCK_WHATSAPP_PROVIDER",
        message: "WHATSAPP_PROVIDER=mock is not allowed in production. Use twilio or disabled.",
      });
    }
    if (
      normalizedProvider(env, "STORAGE_PROVIDER", "local") === "local" &&
      !/^(0|false|no|off)$/i.test(env.FILE_UPLOADS_ENABLED ?? "")
    ) {
      issues.push({
        level: "error",
        code: "PRODUCTION_LOCAL_STORAGE",
        message: "STORAGE_PROVIDER=local is not allowed in production while file uploads are enabled.",
      });
    }
    if (normalizedProvider(env, "RATE_LIMIT_PROVIDER", "memory") === "memory") {
      issues.push({
        level: "error",
        code: "PRODUCTION_MEMORY_RATE_LIMIT",
        message: "RATE_LIMIT_PROVIDER=memory is not durable enough for production. Use upstash or redis.",
      });
    }
    if (normalizedProvider(env, "RATE_LIMIT_PROVIDER", "memory") === "disabled") {
      issues.push({
        level: "error",
        code: "PRODUCTION_DISABLED_RATE_LIMIT",
        message: "RATE_LIMIT_PROVIDER=disabled is not allowed in production.",
      });
    }
  }

  if (appEnv === "staging") {
    const mockProviders = ["PAYMENT_PROVIDER", "AI_PROVIDER", "PUSH_PROVIDER", "WHATSAPP_PROVIDER"].filter(
      (key) => {
        const defaultValue = key === "WHATSAPP_PROVIDER" ? "disabled" : "mock";
        return normalizedProvider(env, key, defaultValue) === "mock" && !env[key]?.trim();
      },
    );
    for (const key of mockProviders) {
      issues.push({
        level: "warning",
        code: `STAGING_IMPLICIT_${key}`,
        message: `${key}=mock is implicit in staging. Set it explicitly so diagnostics reflect an intentional mock mode.`,
      });
    }
    if (normalizedProvider(env, "RATE_LIMIT_PROVIDER", "memory") === "memory" && !env.RATE_LIMIT_PROVIDER?.trim()) {
      issues.push({
        level: "warning",
        code: "STAGING_IMPLICIT_RATE_LIMIT_PROVIDER",
        message: "RATE_LIMIT_PROVIDER=memory is implicit in staging. Set RATE_LIMIT_PROVIDER=upstash or redis for distributed checks, or memory explicitly for a controlled pilot.",
      });
    }
  }

  return { appEnv, apiMode, issues };
}

export function assertRuntimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const result = validateRuntimeConfig(env);
  const errors = result.issues.filter((issue) => issue.level === "error");
  if (errors.length) {
    throw new RuntimeConfigError(errors);
  }
  return result;
}
