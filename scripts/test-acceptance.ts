import { runDbCheck } from "./check-db";
import { env, loadLocalEnvironment, rootDir } from "./shared";
import { spawnSync } from "node:child_process";

async function main() {
  loadLocalEnvironment();

  if (!env("DATABASE_URL")) {
    console.log("Skipping DB-gated acceptance tests because DATABASE_URL is not set.");
    console.log("To run them:");
    console.log("1. Copy `.env.example` to `.env`.");
    console.log("2. Start Postgres and run `pnpm db:push && pnpm db:seed`.");
    console.log("3. Run `RUN_DB_WEB_TESTS=1 pnpm test:web` or `pnpm test:acceptance`.");
    return;
  }

  const dbCheck = await runDbCheck();
  if (dbCheck.status === "fail") {
    console.error(`${dbCheck.label}: ${dbCheck.detail}`);
    if (dbCheck.hint) {
      console.error(dbCheck.hint);
    }
    process.exit(1);
  }

  const result = spawnSync("pnpm", ["exec", "playwright", "test"], {
    cwd: rootDir,
    env: {
      ...process.env,
      RUN_DB_WEB_TESTS: "1"
    },
    stdio: "inherit"
  });

  process.exit(result.status ?? 1);
}

void main();
