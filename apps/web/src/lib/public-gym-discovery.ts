import { getMapProvider } from "@zook/core/providers";
import { prisma } from "@zook/db";
import { buildGymDiscoveryResults, type DiscoveryGym } from "@/server/gym-discovery";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

export type GymResult = DiscoveryGym & {
  priceFromPaise: number | null;
  planCount: number;
};

export function toPositivePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

async function demoGyms(query?: string, city?: string): Promise<GymResult[]> {
  const [{ zookDemoFixtures }, { MockMapProvider }] = await Promise.all([
    import("@zook/core"),
    import("@zook/core/providers"),
  ]);
  const plansByOrgId = new Map<string, Array<{ pricePaise: number }>>();
  for (const plan of zookDemoFixtures.membershipPlans) {
    if (!plan.publicVisible) continue;
    const plans = plansByOrgId.get(plan.orgId) ?? [];
    plans.push({ pricePaise: plan.pricePaise });
    plansByOrgId.set(plan.orgId, plans);
  }
  const results = buildGymDiscoveryResults({
    gyms: zookDemoFixtures.organizations.map((gym) => ({
      id: gym.id,
      name: gym.name,
      username: gym.username,
      city: gym.city,
      state: gym.state,
      visibility: "PUBLIC",
      joinMode: gym.joinMode,
      amenities: gym.amenities,
      coverImageUrl: null,
      logoUrl: null,
    })),
    ...(query ? { query } : {}),
    ...(city ? { city } : {}),
    mapProvider: new MockMapProvider(),
  });
  return withPlanSummaries(results, plansByOrgId);
}

function withPlanSummaries(
  gyms: DiscoveryGym[],
  plansByOrgId: Map<string, Array<{ pricePaise: number }>>,
): GymResult[] {
  return gyms.map((gym) => {
    const plans = plansByOrgId.get(gym.id) ?? [];
    const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
    return {
      ...gym,
      priceFromPaise: paidPlans.length ? Math.min(...paidPlans.map((plan) => plan.pricePaise)) : null,
      planCount: plans.length,
    };
  });
}

export async function searchGyms(query?: string, city?: string): Promise<GymResult[]> {
  try {
    const gyms = await prisma.organization.findMany({
      where: {
        visibility: "PUBLIC",
        ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { username: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: 50,
      orderBy: [{ name: "asc" }],
    });
    const plans = gyms.length
      ? await prisma.membershipPlan.findMany({
          where: {
            orgId: { in: gyms.map((gym) => gym.id) },
            active: true,
            publicVisible: true,
          },
          select: { orgId: true, pricePaise: true },
        })
      : [];
    const plansByOrgId = new Map<string, Array<{ pricePaise: number }>>();
    for (const plan of plans) {
      const current = plansByOrgId.get(plan.orgId) ?? [];
      current.push(plan);
      plansByOrgId.set(plan.orgId, current);
    }
    const results = buildGymDiscoveryResults({
      gyms: gyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        username: gym.username,
        city: gym.city,
        state: gym.state,
        visibility: gym.visibility,
        joinMode: gym.joinMode,
        latitude: gym.latitude ? Number(gym.latitude) : null,
        longitude: gym.longitude ? Number(gym.longitude) : null,
        amenities: Array.isArray(gym.amenities)
          ? gym.amenities.filter((item): item is string => typeof item === "string")
          : [],
        coverImageUrl: gym.coverImageUrl,
        logoUrl: gym.logoUrl,
      })),
      ...(query ? { query } : {}),
      ...(city ? { city } : {}),
      mapProvider: getMapProvider(),
    });
    return withPlanSummaries(results, plansByOrgId);
  } catch (error) {
    if (!canUsePublicDemoFallback()) throw error;
    return demoGyms(query, city);
  }
}
