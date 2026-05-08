import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const rootDir = process.cwd();
const orderedTestEnvFiles = [".env.test.local", ".env.test", ".env.local", ".env"] as const;
const playwrightForwardEnvKeys = [
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
  "ALLOW_MOCK_PAYMENT_COMPLETION",
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
] as const;

function loadOrderedEnvironment() {
  const externalEnv = { ...process.env };
  const parsedEnv: Record<string, string> = {};

  for (const envFile of orderedTestEnvFiles) {
    const filePath = resolve(rootDir, envFile);
    if (!existsSync(filePath)) {
      continue;
    }

    const fileValues = parse(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(fileValues)) {
      if (parsedEnv[key] === undefined) {
        parsedEnv[key] = value;
      }
    }
  }

  Object.assign(process.env, parsedEnv, externalEnv);
}

function pickDefinedEnv(keys: readonly string[], overrides: Record<string, string> = {}) {
  const selected: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      selected[key] = value;
    }
  }

  return { ...selected, ...overrides };
}

loadOrderedEnvironment();

const webServerUrl = "http://127.0.0.1:3120";

export default defineConfig({
  fullyParallel: false,
  testDir: "./apps/web/tests",
  testMatch: ["**/*.spec.ts"],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: webServerUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/run-next-web.mjs dev --hostname 127.0.0.1 --port 3120",
    cwd: rootDir,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      SHELL: process.env.SHELL ?? "",
      TMPDIR: process.env.TMPDIR ?? "",
      CI: process.env.CI ?? "",
      ...pickDefinedEnv(playwrightForwardEnvKeys, {
        NEXT_PUBLIC_APP_URL: webServerUrl,
        NEXT_PUBLIC_WEB_URL: webServerUrl,
        PAYMENT_PROVIDER: process.env.PLAYWRIGHT_PAYMENT_PROVIDER ?? "mock",
        ALLOW_MOCK_PAYMENT_COMPLETION: "true",
        ERROR_REPORTER: process.env.PLAYWRIGHT_ERROR_REPORTER ?? "mock",
        RATE_LIMIT_PROVIDER: process.env.PLAYWRIGHT_RATE_LIMIT_PROVIDER ?? "disabled",
      }),
    },
    url: webServerUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
