import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { zookPrisma?: PrismaClient };

export function prismaDatasourceUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl || process.env.VERCEL !== "1") {
    return undefined;
  }

  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT ?? "1");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT ?? "20");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const datasourceUrl = prismaDatasourceUrl();

export const prisma =
  globalForPrisma.zookPrisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.zookPrisma = prisma;

export * from "@prisma/client";
