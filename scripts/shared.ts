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

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFiles = [".env", ".env.local"] as const;

let didLoadEnvironment = false;

export const playwrightForwardEnvKeys = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "OTP_FIXED_CODE_DEV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "AI_PROVIDER",
  "PAYMENT_PROVIDER",
  "MAP_PROVIDER",
  "STORAGE_PROVIDER",
  "PUSH_PROVIDER"
] as const;

export const providerSelections = [
  {
    label: "Email provider",
    envKey: "EMAIL_PROVIDER",
    defaultValue: "mock",
    liveProviders: {
      smtp: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
      resend: ["RESEND_API_KEY", "EMAIL_FROM"]
    }
  },
  {
    label: "Payment provider",
    envKey: "PAYMENT_PROVIDER",
    defaultValue: "mock",
    liveProviders: {
      razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]
    }
  },
  {
    label: "Storage provider",
    envKey: "STORAGE_PROVIDER",
    defaultValue: "local",
    liveProviders: {
      s3: ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
      r2: ["S3_ENDPOINT", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]
    }
  },
  {
    label: "Maps provider",
    envKey: "MAP_PROVIDER",
    defaultValue: "mock",
    liveProviders: {
      google: ["GOOGLE_MAPS_API_KEY"]
    }
  },
  {
    label: "AI provider",
    envKey: "AI_PROVIDER",
    defaultValue: "mock",
    liveProviders: {
      openai: ["OPENAI_API_KEY"]
    }
  },
  {
    label: "Push provider",
    envKey: "PUSH_PROVIDER",
    defaultValue: "mock",
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

  if (selectedProvider === selection.defaultValue) {
    return pass(
      selection.label,
      `${selection.envKey}=${selectedProvider} (local-safe default)`
    );
  }

  const requiredKeys = selection.liveProviders[selectedProvider as keyof typeof selection.liveProviders];
  if (!requiredKeys) {
    return fail(
      selection.label,
      `${selection.envKey}=${selectedProvider} is not a supported option.`,
      `Supported values: ${[selection.defaultValue, ...Object.keys(selection.liveProviders)].join(", ")}`
    );
  }

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
