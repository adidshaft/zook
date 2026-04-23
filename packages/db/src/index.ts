import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { zookPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.zookPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.zookPrisma = prisma;
}

export * from "@prisma/client";
