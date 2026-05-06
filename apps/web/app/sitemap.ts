import type { MetadataRoute } from "next";
import { zookDemoFixtures } from "@zook/core";
import { prisma } from "@zook/db";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "https://app.zook.kyokasuigetsu.xyz";
  let gyms: Array<{ username: string; updatedAt?: Date | string | null }> = [];
  try {
    gyms = await prisma.organization.findMany({
      where: { visibility: "PUBLIC" },
      select: { username: true, updatedAt: true },
      take: 500,
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    if (!canUsePublicDemoFallback()) {
      throw error;
    }
    gyms = zookDemoFixtures.organizations.map((gym) => ({
      username: gym.username,
      updatedAt: null,
    }));
  }

  return [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/gyms`, changeFrequency: "daily", priority: 0.9 },
    ...gyms.map((gym) => ({
      url: `${baseUrl}/g/${gym.username}`,
      lastModified: gym.updatedAt ? new Date(gym.updatedAt) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
