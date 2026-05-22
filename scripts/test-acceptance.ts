import { runDbCheck } from "./check-db";
import { env, loadLocalEnvironment, rootDir, spawnPnpm } from "./shared";

async function main() {
  loadLocalEnvironment();
  const args = new Set(process.argv.slice(2));
  const requireDb = args.has("--require-db");
  const headed = args.has("--headed");
  const debug = args.has("--debug");

  if (!env("DATABASE_URL")) {
    const message = [
      "DATABASE_URL is not set for DB-gated acceptance tests.",
      "Create `.env.test.local` or `.env.test`, or export DATABASE_URL directly.",
      "Then run `pnpm test:db:prepare` followed by `pnpm test:acceptance:db`.",
    ].join("\n");

    if (requireDb) {
      console.error(message);
      process.exit(1);
    }

    console.log("Skipping DB-gated acceptance tests because DATABASE_URL is not set.");
    console.log(message);
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

  const playwrightArgs = ["exec", "playwright", "test"];
  if (headed) {
    playwrightArgs.push("--headed");
  }
  if (debug) {
    playwrightArgs.push("--debug");
  }

  const result = spawnPnpm(playwrightArgs, {
    cwd: rootDir,
    env: {
      ...process.env,
      APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID ?? "com.zook.app",
      APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID ?? "com.zook.app",
      APPLE_SERVICE_ID: process.env.APPLE_SERVICE_ID ?? "com.zook.web",
      NEXT_PUBLIC_APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID ?? "com.zook.app",
      GOOGLE_WEB_CLIENT_ID:
        process.env.GOOGLE_WEB_CLIENT_ID ?? "test-google-web.apps.googleusercontent.com",
      NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
        "test-google-web.apps.googleusercontent.com",
      RUN_DB_WEB_TESTS: "1",
    },
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

void main();
