import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnvironment, pickDefinedEnv, playwrightForwardEnvKeys } from "./scripts/shared";

loadLocalEnvironment();

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
