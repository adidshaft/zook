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
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "AI_PROVIDER",
  "PAYMENT_PROVIDER",
  "MAP_PROVIDER",
  "STORAGE_PROVIDER",
  "PUSH_PROVIDER"
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

const webServerUrl = "http://127.0.0.1:3100";

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
    command: "pnpm --filter @zook/web dev -- --hostname 127.0.0.1 --port 3100",
    env: {
      ...process.env,
      ...pickDefinedEnv(playwrightForwardEnvKeys, {
        NEXT_PUBLIC_APP_URL: webServerUrl,
        NEXT_PUBLIC_WEB_URL: webServerUrl
      })
    },
    url: webServerUrl,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
