import { execFileSync, spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  status: CheckStatus;
  label: string;
  detail: string;
  hint?: string;
}

export const envProfiles = ["local", "staging", "production"] as const;
export type EnvProfile = (typeof envProfiles)[number];

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const orderedTestEnvFiles = [".env.test.local", ".env.test", ".env.local", ".env"] as const;

let didLoadEnvironment = false;

export const playwrightForwardEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "OTP_FIXED_CODE_DEV",
  "APP_ENV",
  "API_MODE",
  "ENV_PROFILE",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "MOBILE_API_BASE_URL",
  "ZOOK_QR_SECRET",
  "AI_PROVIDER",
  "PAYMENT_PROVIDER",
  "EMAIL_PROVIDER",
  "MAP_PROVIDER",
  "STORAGE_PROVIDER",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "PUSH_PROVIDER",
  "RATE_LIMIT_PROVIDER",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RATE_LIMIT_NAMESPACE",
  "ERROR_REPORTER",
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "EXPO_PUBLIC_SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "MAINTENANCE_MOCK_MODE",
  "SEED_DEMO_USERS_ENABLED",
  "ALLOW_FIXED_OTP_IN_STAGING",
  "ALLOW_MOCK_PAYMENT_COMPLETION",
] as const;

export const providerSelections = [
  {
    label: "Email provider",
    envKey: "EMAIL_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "resend", "smtp"],
    liveProviders: {
      smtp: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
      resend: ["RESEND_API_KEY", "EMAIL_FROM"],
    },
  },
  {
    label: "Payment provider",
    envKey: "PAYMENT_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "razorpay", "disabled"],
    liveProviders: {
      razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
      disabled: [],
    },
  },
  {
    label: "Storage provider",
    envKey: "STORAGE_PROVIDER",
    defaultValue: "local",
    implementedProviders: ["local", "s3", "r2", "supabase"],
    liveProviders: {
      supabase: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"],
      s3: ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
      r2: ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
    },
  },
  {
    label: "Maps provider",
    envKey: "MAP_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "google"],
    liveProviders: {
      google: ["GOOGLE_MAPS_API_KEY"],
    },
  },
  {
    label: "AI provider",
    envKey: "AI_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "openai", "disabled"],
    liveProviders: {
      openai: ["OPENAI_API_KEY"],
      disabled: [],
    },
  },
  {
    label: "Push provider",
    envKey: "PUSH_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "expo", "disabled"],
    liveProviders: {
      expo: ["EXPO_PROJECT_ID"],
      disabled: [],
    },
  },
  {
    label: "SMS provider",
    envKey: "SMS_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "webhook", "msg91", "disabled"],
    liveProviders: {
      webhook: ["SMS_WEBHOOK_URL"],
      msg91: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
      disabled: [],
    },
  },
] as const;

export function loadLocalEnvironment() {
  if (didLoadEnvironment) {
    return process.env;
  }

  const externalEnv = { ...process.env };
  const parsedEnv: Record<string, string> = {};

  for (const fileName of orderedTestEnvFiles) {
    const filePath = resolve(rootDir, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const fileContents = readFileSync(filePath, "utf8");
    const fileValues = parse(fileContents);
    for (const [key, value] of Object.entries(fileValues)) {
      if (parsedEnv[key] === undefined) {
        parsedEnv[key] = value;
      }
    }
  }

  Object.assign(process.env, parsedEnv, externalEnv);
  didLoadEnvironment = true;
  return process.env;
}

export function env(key: string) {
  const value = process.env[key];
  return value?.trim() ? value.trim() : undefined;
}

export function isTruthy(value: string | undefined) {
  return /^(1|true|yes|on)$/i.test(value ?? "");
}

export function resolveEnvProfile(): EnvProfile {
  const profile = (env("APP_ENV") ?? env("ENV_PROFILE"))?.toLowerCase();
  if (profile && envProfiles.includes(profile as EnvProfile)) {
    return profile as EnvProfile;
  }
  if (profile) {
    throw new Error(
      `APP_ENV/ENV_PROFILE=${profile} is not supported. Use one of: ${envProfiles.join(", ")}.`,
    );
  }
  return "local";
}

export function isAbsoluteHttpUrl(value: string | undefined) {
  if (!value) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isLocalhostUrl(value: string | undefined) {
  if (!value || !isAbsoluteHttpUrl(value)) {
    return false;
  }
  return /(^|\.)localhost$|127\.0\.0\.1|0\.0\.0\.0/i.test(new URL(value).hostname);
}

export function isStrongSecret(value: string | undefined) {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length < 32) {
    return false;
  }
  if (/replace-me|changeme|example|secret|password/i.test(trimmed)) {
    return false;
  }
  const uniqueChars = new Set(trimmed).size;
  return uniqueChars >= 8;
}

export function pass(label: string, detail: string, hint?: string): CheckResult {
  return { status: "pass", label, detail, ...(hint ? { hint } : {}) };
}

export function warn(label: string, detail: string, hint?: string): CheckResult {
  return { status: "warn", label, detail, ...(hint ? { hint } : {}) };
}

export function fail(label: string, detail: string, hint?: string): CheckResult {
  return { status: "fail", label, detail, ...(hint ? { hint } : {}) };
}

export function pickDefinedEnv(keys: readonly string[], overrides: Record<string, string> = {}) {
  const selected: Record<string, string> = {};
  for (const key of keys) {
    const value = env(key);
    if (value !== undefined) {
      selected[key] = value;
    }
  }

  return { ...selected, ...overrides };
}

export function readPackageManagerVersion() {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8")) as {
    packageManager?: string;
  };
  return packageJson.packageManager?.split("@")[1];
}

const pnpmCandidates = [
  "/opt/homebrew/bin/pnpm",
  "pnpm",
  "/usr/local/bin/pnpm",
  resolve(rootDir, "node_modules/.bin/pnpm"),
] as const;

export function resolvePnpmCommand() {
  const errors: string[] = [];
  for (const candidate of pnpmCandidates) {
    try {
      execFileSync(candidate, ["--version"], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return candidate;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors[0] ?? "Unable to resolve pnpm.");
}

export function withPnpmPath(envInput: NodeJS.ProcessEnv = process.env) {
  return {
    ...envInput,
    PATH: ["/opt/homebrew/bin", "/usr/local/bin", envInput.PATH].filter(Boolean).join(":"),
  };
}

export function spawnPnpm(args: string[], options: SpawnSyncOptions = {}) {
  return spawnSync(resolvePnpmCommand(), args, {
    ...options,
    cwd: options.cwd ?? rootDir,
    env: withPnpmPath(options.env as NodeJS.ProcessEnv | undefined),
  });
}

export function readPnpmVersion() {
  return execFileSync(resolvePnpmCommand(), ["--version"], {
    cwd: rootDir,
    encoding: "utf8",
    env: withPnpmPath(),
  }).trim();
}

export function hasGeneratedPrismaClient() {
  const candidates = [
    resolve(rootDir, "node_modules/@prisma/client/index.d.ts"),
    resolve(rootDir, "node_modules/@prisma/client/index.js"),
    resolve(rootDir, "packages/db/node_modules/@prisma/client/index.d.ts"),
    resolve(rootDir, "packages/db/node_modules/@prisma/client/index.js"),
    resolve(rootDir, "node_modules/.prisma/client/index.d.ts"),
    resolve(rootDir, "packages/db/node_modules/.prisma/client/index.d.ts"),
    resolve(rootDir, "node_modules/.prisma/client/index.js"),
    resolve(rootDir, "packages/db/node_modules/.prisma/client/index.js"),
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

export function evaluateProviderSelection(
  selection: (typeof providerSelections)[number],
): CheckResult {
  const selectedProvider = env(selection.envKey) ?? selection.defaultValue;
  const supportedProviders = [selection.defaultValue, ...Object.keys(selection.liveProviders)];

  if (selectedProvider === selection.defaultValue) {
    return pass(selection.label, `${selection.envKey}=${selectedProvider} (local-safe default)`);
  }

  if (!supportedProviders.includes(selectedProvider)) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is not a supported option.`,
      `Supported values: ${supportedProviders.join(", ")}`,
    );
  }

  if (!selection.implementedProviders.includes(selectedProvider)) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is configured, but that provider is not implemented in the runtime registry yet.`,
      `Use ${selection.defaultValue} until the runtime adapter ships.`,
    );
  }

  const requiredKeys =
    selection.liveProviders[selectedProvider as keyof typeof selection.liveProviders];
  if (!requiredKeys?.length) {
    return pass(selection.label, `${selection.envKey}=${selectedProvider} is selected.`);
  }
  const missingKeys = requiredKeys.filter((key) => !env(key));
  if (missingKeys.length > 0) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is missing ${missingKeys.join(", ")}.`,
      `Either configure the missing keys or switch back to ${selection.defaultValue}.`,
    );
  }

  return pass(selection.label, `${selection.envKey}=${selectedProvider} is fully configured.`);
}

export function runCommand(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

export function renderResult(result: CheckResult) {
  const prefix =
    result.status === "pass" ? "[pass]" : result.status === "warn" ? "[warn]" : "[fail]";

  console.log(`${prefix} ${result.label}: ${result.detail}`);
  if (result.hint) {
    console.log(`       ${result.hint}`);
  }
}
