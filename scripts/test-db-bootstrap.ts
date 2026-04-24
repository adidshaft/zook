import { PrismaClient } from "@prisma/client";
import { URL } from "node:url";
import { runDbCheck } from "./check-db";
import { env, hasGeneratedPrismaClient, isTruthy, loadLocalEnvironment, runCommand } from "./shared";

function describeDatabaseTarget(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "") || "(default)";
  return {
    host: parsed.hostname || "unknown",
    databaseName
  };
}

function assertSafeResetTarget(databaseUrl: string) {
  const { host, databaseName } = describeDatabaseTarget(databaseUrl);
  const envProfile = env("ENV_PROFILE") ?? "local";
  const looksLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|db|postgres)$/i.test(host);
  const looksTestDatabase = /(test|local|dev|zook)/i.test(databaseName);

  if (envProfile === "production") {
    throw new Error("Refusing to prepare a test database while ENV_PROFILE=production.");
  }

  if (!looksLocalHost && !looksTestDatabase && !isTruthy(env("ZOOK_TEST_DB_ALLOW_RESET"))) {
    throw new Error(
      `Refusing to reset DATABASE_URL against ${host}/${databaseName}. Point DATABASE_URL at a dedicated local/test database or set ZOOK_TEST_DB_ALLOW_RESET=1 if you are absolutely sure this target is safe to reset.`,
    );
  }
}

async function main() {
  loadLocalEnvironment();

  const databaseUrl = env("DATABASE_URL");
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    console.error("Create `.env.test.local` or `.env.test` from `.env.test.example`, then rerun `pnpm test:db:prepare`.");
    process.exit(1);
  }

  assertSafeResetTarget(databaseUrl);

  const dbCheck = await runDbCheck();
  if (dbCheck.status === "fail") {
    console.error(`${dbCheck.label}: ${dbCheck.detail}`);
    if (dbCheck.hint) {
      console.error(dbCheck.hint);
    }
    console.error("Ensure Postgres is reachable before preparing DB-backed acceptance tests.");
    process.exit(1);
  }

  if (!hasGeneratedPrismaClient()) {
    runCommand("pnpm", ["db:generate"], "Prisma client generation");
  }

  runCommand(
    "pnpm",
    ["--filter", "@zook/db", "exec", "prisma", "db", "push", "--schema", "prisma/schema.prisma", "--force-reset"],
    "Prisma db push --force-reset",
  );

  const prisma = new PrismaClient({ log: ["error"] });
  try {
    await prisma.$queryRawUnsafe("select 1");
  } finally {
    await prisma.$disconnect();
  }

  runCommand("pnpm", ["seed:pilot"], "Pilot seed");

  console.log("Test database is ready for DB-gated acceptance runs.");
  console.log("Next steps:");
  console.log("1. `RUN_DB_WEB_TESTS=1 pnpm test:web`");
  console.log("2. `pnpm test:acceptance:db`");
}

void main();
