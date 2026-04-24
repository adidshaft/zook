import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { runDbCheck } from "./check-db";
import { runReleaseEnvChecks } from "./check-release-env";
import { env, loadLocalEnvironment, renderResult, rootDir, type CheckResult, warn, pass } from "./shared";

function runPrismaDriftCheck(): CheckResult {
  const migrationsDir = resolve(rootDir, "packages/db/prisma/migrations");
  if (!existsSync(migrationsDir)) {
    return warn(
      "Prisma drift",
      "Migration history is not present in packages/db/prisma/migrations.",
      "This repo still appears db-push oriented, so schema drift cannot be verified automatically yet."
    );
  }

  if (!env("DATABASE_URL")) {
    return warn("Prisma drift", "DATABASE_URL is not set, so drift checks were skipped.");
  }

  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@zook/db",
      "exec",
      "prisma",
      "migrate",
      "status",
      "--schema",
      "prisma/schema.prisma"
    ],
    {
      cwd: rootDir,
      env: process.env,
      encoding: "utf8"
    }
  );

  if (result.status === 0) {
    return pass("Prisma drift", "Prisma migration status completed without drift errors.");
  }

  return warn(
    "Prisma drift",
    "Prisma migration status could not confirm a clean migration state.",
    result.stderr.trim() || result.stdout.trim() || "Review Prisma migration status manually."
  );
}

async function main() {
  loadLocalEnvironment();
  console.log("Zook release preflight");
  console.log("");

  const envResults = await runReleaseEnvChecks();
  const dbResult = await runDbCheck();
  const driftResult = runPrismaDriftCheck();
  const results = [...envResults, dbResult, driftResult];

  for (const result of results) {
    renderResult(result);
  }

  const failures = results.filter((result) => result.status === "fail").length;
  const warnings = results.filter((result) => result.status === "warn").length;

  console.log("");
  if (failures > 0) {
    console.log(`Release preflight failed with ${failures} blocking issue(s) and ${warnings} warning(s).`);
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`Release preflight passed with ${warnings} warning(s).`);
    return;
  }

  console.log("Release preflight passed with no issues.");
}

void main();
