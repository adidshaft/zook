import { loadLocalEnvironment, rootDir, spawnPnpm } from "./shared";

loadLocalEnvironment();

if (process.env.APP_ENV?.trim().toLowerCase() === "production") {
  throw new Error("Refusing to seed pilot data when APP_ENV=production.");
}

const result = spawnPnpm(["db:seed"], {
  cwd: rootDir,
  env: {
    ...process.env,
    ZOOK_SEED_MODE: "pilot",
  },
  stdio: "inherit",
});

process.exit(result.status ?? 1);
