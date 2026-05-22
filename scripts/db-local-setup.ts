import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { readdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { env, loadLocalEnvironment, rootDir } from "./shared";

const schemaArgs = ["--schema", "prisma/schema.prisma"];

function run(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function runCaptured(command: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    encoding: "utf8",
  });
}

function printCaptured(result: SpawnSyncReturns<string>) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function ensureDockerReady() {
  const result = runCaptured("docker", ["info"]);
  if (result.status === 0) {
    return;
  }

  console.error("Docker daemon is not reachable.");
  console.error("Start Docker Desktop, then rerun `pnpm db:local:setup`.");
  process.exit(1);
}

async function waitForPostgres() {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const result = runCaptured("docker", [
      "inspect",
      "--format={{.State.Health.Status}}",
      "zook-postgres",
    ]);
    if (result.stdout.trim() === "healthy") {
      console.log("Postgres is healthy.");
      return;
    }
    await sleep(2000);
  }

  run("docker", ["compose", "logs", "--tail=80", "postgres"], "Postgres logs");
  throw new Error("Postgres did not become healthy in time.");
}

function runDeploy() {
  return runCaptured("pnpm", ["tsx", "scripts/prisma-db.ts", "migrate", "deploy", ...schemaArgs]);
}

function hasNoSchemaDiff(databaseUrl: string) {
  const result = runCaptured("pnpm", [
    "--filter",
    "@zook/db",
    "exec",
    "prisma",
    "migrate",
    "diff",
    "--from-schema-datamodel",
    "prisma/schema.prisma",
    "--to-url",
    databaseUrl,
    "--exit-code",
  ]);

  printCaptured(result);
  return result.status === 0;
}

function resolveMigrationAsApplied(migrationName: string) {
  run(
    "pnpm",
    [
      "tsx",
      "scripts/prisma-db.ts",
      "migrate",
      "resolve",
      "--applied",
      migrationName,
      ...schemaArgs,
    ],
    `Prisma resolve ${migrationName}`,
  );
}

function rollbackFailedMigration(migrationName: string) {
  const result = runCaptured("pnpm", [
    "tsx",
    "scripts/prisma-db.ts",
    "migrate",
    "resolve",
    "--rolled-back",
    migrationName,
    ...schemaArgs,
  ]);

  printCaptured(result);
  return result.status === 0;
}

function migrationNames() {
  return readdirSync(`${rootDir}/packages/db/prisma/migrations`, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function markCurrentSchemaMigrationsApplied() {
  for (const migrationName of migrationNames()) {
    const applied = runCaptured("pnpm", [
      "tsx",
      "scripts/prisma-db.ts",
      "migrate",
      "resolve",
      "--applied",
      migrationName,
      ...schemaArgs,
    ]);

    if (applied.status === 0) {
      printCaptured(applied);
      continue;
    }

    const output = `${applied.stdout ?? ""}\n${applied.stderr ?? ""}`;
    if (output.includes("P3008") || output.includes("already recorded as applied")) {
      printCaptured(applied);
      continue;
    }

    if (!output.includes("failed migration")) {
      printCaptured(applied);
      throw new Error(`Prisma resolve ${migrationName} failed.`);
    }

    if (!rollbackFailedMigration(migrationName)) {
      throw new Error(`Prisma rollback resolve ${migrationName} failed.`);
    }
    resolveMigrationAsApplied(migrationName);
  }
}

function deployWithExistingDatabaseBaseline() {
  const firstDeploy = runDeploy();
  printCaptured(firstDeploy);

  if (firstDeploy.status === 0) {
    return;
  }

  const output = `${firstDeploy.stdout ?? ""}\n${firstDeploy.stderr ?? ""}`;
  if (!output.includes("P3005") && !output.includes("P3009")) {
    throw new Error(
      `Prisma migrate deploy failed with exit code ${firstDeploy.status ?? "unknown"}.`,
    );
  }

  const databaseUrl = env("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  console.log("");
  console.log(
    "Existing local database is non-empty. Checking whether it matches the Prisma schema...",
  );
  if (!hasNoSchemaDiff(databaseUrl)) {
    throw new Error(
      "Existing database differs from prisma/schema.prisma. Refusing to auto-baseline; inspect the diff or reset a disposable local DB.",
    );
  }

  console.log("Existing schema matches Prisma. Marking represented migrations as applied.");
  markCurrentSchemaMigrationsApplied();

  const secondDeploy = runDeploy();
  printCaptured(secondDeploy);
  if (secondDeploy.status !== 0) {
    throw new Error(
      `Prisma migrate deploy failed after baseline with exit code ${secondDeploy.status ?? "unknown"}.`,
    );
  }
}

async function main() {
  loadLocalEnvironment();

  if (!env("DATABASE_URL")) {
    console.error(
      "DATABASE_URL is not set. Copy `.env.example` to `.env`, then rerun `pnpm db:local:setup`.",
    );
    process.exit(1);
  }

  ensureDockerReady();
  run("docker", ["compose", "up", "-d", "postgres"], "Docker compose Postgres startup");
  await waitForPostgres();

  run("pnpm", ["db:generate"], "Prisma client generation");
  deployWithExistingDatabaseBaseline();
  run("pnpm", ["seed:demo"], "Demo seed");
  run("pnpm", ["release:preflight"], "Release preflight");

  console.log("");
  console.log("Local backend database is ready.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
