import { env, fail, loadLocalEnvironment, pass, type CheckResult } from "./shared";

export async function runDbCheck(): Promise<CheckResult> {
  loadLocalEnvironment();

  if (!env("DATABASE_URL")) {
    return fail(
      "Database connection",
      "DATABASE_URL is not set.",
      "Copy `.env.example` to `.env` and point DATABASE_URL at your local Postgres instance."
    );
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({
    log: ["error"]
  });

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ database_name: string; schema_name: string }>>(
      "select current_database() as database_name, current_schema() as schema_name"
    );
    const row = rows[0];
    return pass(
      "Database connection",
      row ? `Connected to ${row.database_name} (schema ${row.schema_name}).` : "Connected successfully."
    );
  } catch (error) {
    return fail(
      "Database connection",
      error instanceof Error ? error.message : "Database reachability check failed.",
      "Start Postgres, verify DATABASE_URL, then run `pnpm db:push` and `pnpm db:seed`."
    );
  } finally {
    await prisma.$disconnect();
  }
}
