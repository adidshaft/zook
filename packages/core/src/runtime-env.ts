export type AppEnv = "local" | "staging" | "production";
export type ApiMode = "backend" | "offline-demo";

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

export function getAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return (
    normalizeAppEnv(env.APP_ENV) ??
    normalizeAppEnv(env.ENV_PROFILE) ??
    normalizeAppEnv(env.EXPO_PUBLIC_APP_ENV) ??
    "local"
  );
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

export function canReturnDevOtp(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "test") {
    return true;
  }
  return getAppEnv(env) === "local" && isTruthy(env.ALLOW_DEV_OTP_RESPONSE);
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

