import { runDbCheck } from "./check-db";
import { loadLocalEnvironment, runCommand } from "./shared";

async function main() {
  loadLocalEnvironment();
  if (process.env.APP_ENV?.trim().toLowerCase() === "production") {
    throw new Error("Refusing to reset or seed data when APP_ENV=production.");
  }
  const dbCheck = await runDbCheck();

  if (dbCheck.status === "fail") {
    console.error(`${dbCheck.label}: ${dbCheck.detail}`);
    if (dbCheck.hint) {
      console.error(dbCheck.hint);
    }
    process.exit(1);
  }

  runCommand(
    "pnpm",
    ["--filter", "@zook/db", "exec", "prisma", "db", "push", "--schema", "prisma/schema.prisma", "--force-reset"],
    "Prisma db push --force-reset"
  );
  runCommand("pnpm", ["db:generate"], "Prisma client generation");
  runCommand("pnpm", ["db:seed"], "Database seed");
}

void main();
