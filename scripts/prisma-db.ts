import { loadLocalEnvironment, rootDir, spawnPnpm } from "./shared";

loadLocalEnvironment();

const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error("Usage: pnpm tsx scripts/prisma-db.ts <prisma args>");
  process.exit(1);
}

const result = spawnPnpm(["--filter", "@zook/db", "exec", "prisma", ...prismaArgs], {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
