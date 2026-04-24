import { spawnSync } from "node:child_process";
import { loadLocalEnvironment, rootDir } from "./shared";

loadLocalEnvironment();

const result = spawnSync("pnpm", ["db:seed"], {
  cwd: rootDir,
  env: {
    ...process.env,
    ZOOK_SEED_MODE: "demo"
  },
  stdio: "inherit"
});

process.exit(result.status ?? 1);
