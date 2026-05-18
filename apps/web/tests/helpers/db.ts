import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test } from "@playwright/test";
import { prisma } from "@zook/db";

const execFileAsync = promisify(execFile);

export function requireDb() {
  if (process.env.RUN_DB_WEB_TESTS !== "1") {
    test.skip(true, "DB-gated tests run only when RUN_DB_WEB_TESTS=1.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "RUN_DB_WEB_TESTS=1 was set, but DATABASE_URL is missing. Run `pnpm test:db:prepare` first.",
    );
  }
}

export async function withFreshSeed() {
  await execFileAsync("pnpm", ["test:db:prepare"], {
    cwd: process.cwd(),
    env: { ...process.env, RUN_DB_WEB_TESTS: "1" },
    maxBuffer: 1024 * 1024 * 20,
  });
}

export async function queryDb<T = unknown>(sql: string, ...values: unknown[]) {
  return prisma.$queryRawUnsafe<T>(sql, ...values);
}

export async function findMember(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const [memberProfiles, organizationRoles, organizationUsers, subscriptions] = await Promise.all([
    prisma.memberProfile.findMany({ where: { userId: user.id } }),
    prisma.organizationRoleAssignment.findMany({ where: { userId: user.id } }),
    prisma.organizationUser.findMany({ where: { userId: user.id } }),
    prisma.memberSubscription.findMany({ where: { memberUserId: user.id } }),
  ]);
  return { ...user, memberProfiles, organizationRoles, organizationUsers, subscriptions };
}

export async function getSeededOrg(username = "aarogya-strength") {
  return prisma.organization.findUniqueOrThrow({ where: { username } });
}

export async function getSeededUser(email: string) {
  return prisma.user.findUniqueOrThrow({ where: { email } });
}
