import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

const rootDir = process.cwd();
for (const envFile of [".env", ".env.local"]) {
  const filePath = resolve(rootDir, envFile);
  if (existsSync(filePath)) {
    loadDotenv({ path: filePath, override: false });
  }
}

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
  "EMAIL_PROVIDER",
  "MAP_PROVIDER",
  "STORAGE_PROVIDER",
  "PUSH_PROVIDER",
  "MAINTENANCE_MOCK_MODE",
  "SEED_DEMO_USERS_ENABLED",
  "ALLOW_FIXED_OTP_IN_STAGING"
] as const;

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

const webServerUrl = "http://127.0.0.1:3120";

export default defineConfig({
  testDir: "./apps/web/tests",
  testMatch: ["**/*.spec.ts"],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: webServerUrl,
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm --filter @zook/web exec next dev --hostname 127.0.0.1 --port 3120",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      SHELL: process.env.SHELL ?? "",
      TMPDIR: process.env.TMPDIR ?? "",
      CI: process.env.CI ?? "",
      ...pickDefinedEnv(playwrightForwardEnvKeys, {
        NEXT_PUBLIC_APP_URL: webServerUrl,
        NEXT_PUBLIC_WEB_URL: webServerUrl
      })
    },
    url: webServerUrl,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
