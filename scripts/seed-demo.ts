import { spawnSync } from "node:child_process";
import { loadLocalEnvironment, rootDir } from "./shared";

loadLocalEnvironment();

if (process.env.APP_ENV?.trim().toLowerCase() === "production") {
  throw new Error("Refusing to seed demo data when APP_ENV=production.");
}

const result = spawnSync("pnpm", ["db:seed"], {
  cwd: rootDir,
  env: {
    ...process.env,
    ZOOK_SEED_MODE: "demo"
  },
  stdio: "inherit"
});

process.exit(result.status ?? 1);
