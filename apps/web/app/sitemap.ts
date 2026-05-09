import type { MetadataRoute } from "next";
import { zookDemoFixtures } from "@zook/core";
import { prisma } from "@zook/db";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://zookfit.in";
  let gyms: Array<{ username: string; updatedAt?: Date | string | null }> = [];
  try {
    gyms = await prisma.organization.findMany({
      where: { visibility: "PUBLIC" },
      select: { username: true, updatedAt: true },
      take: 500,
      orderBy: { updatedAt: "desc" },
    });
  } catch {
    if (canUsePublicDemoFallback()) {
      gyms = zookDemoFixtures.organizations.map((gym) => ({
        username: gym.username,
        updatedAt: null,
      }));
    } else {
      console.warn("Sitemap public gym entries were skipped because the database was unavailable.");
    }
  }

  return [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/gyms`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/privacy`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/terms`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/support`, changeFrequency: "monthly", priority: 0.4 },
    ...gyms.map((gym) => ({
      url: `${baseUrl}/g/${gym.username}`,
      lastModified: gym.updatedAt ? new Date(gym.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
