import { randomInt } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";

function generateMemberSlug() {
  let value = "";
  for (let i = 0; i < 8; i++) {
    value += alphabet[randomInt(alphabet.length)];
  }
  return value;
}

async function createUniqueSlug() {
  for (let i = 0; i < 8; i++) {
    const slug = generateMemberSlug();
    const existing = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not generate a unique member slug.");
}

async function main() {
  const users = await prisma.user.findMany({
    where: { slug: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  for (const user of users) {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { slug: await createUniqueSlug() },
        });
        updated++;
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }
        throw error;
      }
    }
  }

  console.log(`Backfilled member slugs for ${updated} user(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
