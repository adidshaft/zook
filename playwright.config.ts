import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/tests",
  testMatch: ["**/*.spec.ts"],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm --filter @zook/web exec next dev -p 3100",
    url: "http://127.0.0.1:3100",
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
