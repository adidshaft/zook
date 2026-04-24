import { execFileSync, spawnSync } from "node:child_process";
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
const envFiles = [".env", ".env.local"] as const;

let didLoadEnvironment = false;

export const playwrightForwardEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "OTP_FIXED_CODE_DEV",
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
  "PUSH_PROVIDER",
  "MAINTENANCE_MOCK_MODE",
  "SEED_DEMO_USERS_ENABLED",
  "ALLOW_FIXED_OTP_IN_STAGING"
] as const;

export const providerSelections = [
  {
    label: "Email provider",
    envKey: "EMAIL_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "resend", "smtp"],
    liveProviders: {
      smtp: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
      resend: ["RESEND_API_KEY", "EMAIL_FROM"]
    }
  },
  {
    label: "Payment provider",
    envKey: "PAYMENT_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock"],
    liveProviders: {
      razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]
    }
  },
  {
    label: "Storage provider",
    envKey: "STORAGE_PROVIDER",
    defaultValue: "local",
    implementedProviders: ["local", "s3", "r2"],
    liveProviders: {
      s3: ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
      r2: ["S3_ENDPOINT", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]
    }
  },
  {
    label: "Maps provider",
    envKey: "MAP_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "google"],
    liveProviders: {
      google: ["GOOGLE_MAPS_API_KEY"]
    }
  },
  {
    label: "AI provider",
    envKey: "AI_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock", "openai"],
    liveProviders: {
      openai: ["OPENAI_API_KEY"]
    }
  },
  {
    label: "Push provider",
    envKey: "PUSH_PROVIDER",
    defaultValue: "mock",
    implementedProviders: ["mock"],
    liveProviders: {
      expo: ["EXPO_ACCESS_TOKEN"]
    }
  }
] as const;

export function loadLocalEnvironment() {
  if (didLoadEnvironment) {
    return process.env;
  }

  const externalEnv = { ...process.env };
  const parsedEnv: Record<string, string> = {};

  for (const fileName of envFiles) {
    const filePath = resolve(rootDir, fileName);
    if (!existsSync(filePath)) {
      continue;
    }

    const fileContents = readFileSync(filePath, "utf8");
    Object.assign(parsedEnv, parse(fileContents));
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
  const profile = env("ENV_PROFILE")?.toLowerCase();
  if (profile && envProfiles.includes(profile as EnvProfile)) {
    return profile as EnvProfile;
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

export function readPnpmVersion() {
  return execFileSync("pnpm", ["--version"], {
    cwd: rootDir,
    encoding: "utf8"
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
    resolve(rootDir, "packages/db/node_modules/.prisma/client/index.js")
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

export function evaluateProviderSelection(
  selection: (typeof providerSelections)[number]
): CheckResult {
  const selectedProvider = env(selection.envKey) ?? selection.defaultValue;
  const supportedProviders = [selection.defaultValue, ...Object.keys(selection.liveProviders)];

  if (selectedProvider === selection.defaultValue) {
    return pass(
      selection.label,
      `${selection.envKey}=${selectedProvider} (local-safe default)`
    );
  }

  if (!supportedProviders.includes(selectedProvider)) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is not a supported option.`,
      `Supported values: ${supportedProviders.join(", ")}`
    );
  }

  if (!selection.implementedProviders.includes(selectedProvider)) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is configured, but that provider is not implemented in the runtime registry yet.`,
      `Use ${selection.defaultValue} until the runtime adapter ships.`
    );
  }

  const requiredKeys = selection.liveProviders[selectedProvider as keyof typeof selection.liveProviders];
  const missingKeys = requiredKeys.filter((key) => !env(key));
  if (missingKeys.length > 0) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is missing ${missingKeys.join(", ")}.`,
      `Either configure the missing keys or switch back to ${selection.defaultValue}.`
    );
  }

  return pass(selection.label, `${selection.envKey}=${selectedProvider} is fully configured.`);
}

export function runCommand(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit"
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
