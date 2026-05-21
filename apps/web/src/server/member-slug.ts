import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@zook/db";

const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
const slugLength = 8;
const slugRegex = /^[0-9a-z]{4,20}$/;
const reservedSlugs = new Set([
  "me",
  "m",
  "g",
  "in",
  "join",
  "r",
  "qr",
  "gyms",
  "guardian",
  "guardian-consent",
  "login",
  "verify-otp",
  "support",
  "terms",
  "privacy",
  "status",
  "dashboard",
  "desk",
  "coach",
  "platform",
  "staff",
  "start-gym",
  "checkout",
  "api",
  "_next",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "admin",
  "owner",
  "manager",
  "trainer",
  "member",
  "settings",
]);

export function generateMemberSlug() {
  let value = "";
  for (let i = 0; i < slugLength; i++) {
    value += alphabet[randomInt(alphabet.length)];
  }
  return value;
}

export function isValidSlugFormat(value: string) {
  return slugRegex.test(value);
}

export function isReservedSlug(value: string) {
  return reservedSlugs.has(value.toLowerCase());
}

export async function createUniqueMemberSlug() {
  for (let i = 0; i < 8; i++) {
    const slug = generateMemberSlug();
    if (isReservedSlug(slug)) {
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return slug;
    }
  }
  throw new Error("Could not generate a unique member slug.");
}

export async function ensureMemberSlugForUser(user: { id: string; slug?: string | null }) {
  if (user.slug) {
    return user.slug;
  }

  for (let i = 0; i < 8; i++) {
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { slug: await createUniqueMemberSlug() },
        select: { slug: true },
      });
      if (updated.slug) {
        return updated.slug;
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not assign a unique member slug.");
}
