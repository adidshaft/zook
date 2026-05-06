import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { zookDemoFixtures } from "@zook/core";
import { MockMapProvider } from "@zook/core/providers";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr, joinModeLabel } from "@/lib/format";
import { buildGymDiscoveryResults, type DiscoveryGym } from "@/server/gym-discovery";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

export const metadata: Metadata = {
  title: "Find a gym | Zook",
  description: "Search public gyms using Zook for memberships, QR entry, and member workflows.",
  alternates: { canonical: "/gyms" },
};

type GymSearchParams = Promise<{ q?: string; city?: string; page?: string }>;

type GymResult = DiscoveryGym & {
  priceFromPaise: number | null;
  planCount: number;
};

function toPositivePage(value?: string) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function demoGyms(query?: string, city?: string): GymResult[] {
  const plansByOrgId = new Map<string, Array<{ pricePaise: number }>>();
  for (const plan of zookDemoFixtures.membershipPlans) {
    if (!plan.publicVisible) {
      continue;
    }
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
  return results.map((gym) => {
    const plans = plansByOrgId.get(gym.id) ?? [];
    return {
      ...gym,
      priceFromPaise: plans.length ? Math.min(...plans.map((plan) => plan.pricePaise)) : null,
      planCount: plans.length,
    };
  });
}

async function searchGyms(query?: string, city?: string): Promise<GymResult[]> {
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
      mapProvider: new MockMapProvider(),
    });
    return results.map((gym) => {
      const orgPlans = plansByOrgId.get(gym.id) ?? [];
      return {
        ...gym,
        priceFromPaise: orgPlans.length
          ? Math.min(...orgPlans.map((plan) => plan.pricePaise))
          : null,
        planCount: orgPlans.length,
      };
    });
  } catch (error) {
    if (!canUsePublicDemoFallback()) {
      throw error;
    }
    return demoGyms(query, city);
  }
}

export default async function GymsPage({ searchParams }: { searchParams: GymSearchParams }) {
  const query = await searchParams;
  const q = query.q?.trim() || undefined;
  const city = query.city?.trim() || undefined;
  const page = toPositivePage(query.page);
  const gyms = await searchGyms(q, city);
  const pageSize = 50;
  const pageStart = (page - 1) * pageSize;
  const visibleGyms = gyms.slice(pageStart, pageStart + pageSize);
  const totalPages = Math.max(1, Math.ceil(gyms.length / pageSize));

  return (
    <main className="min-h-dvh px-5 py-5">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ZookLogo />
          <Link
            href="/login"
            className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
          >
            Login
          </Link>
        </header>

        <GlassCard variant="strong">
          <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:items-end">
            <div>
              <Pill tone="lime">Gym discovery</Pill>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Find a gym near you.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
                Search public Zook gyms by city, name, or username and jump straight into the gym
                profile or membership flow.
              </p>
            </div>
            <form
              action="/gyms"
              className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4"
            >
              <label
                htmlFor="gym-search"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35"
              >
                Search
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                <Search size={18} className="text-white/35" />
                <input
                  id="gym-search"
                  name="q"
                  defaultValue={q}
                  placeholder="Gym name or username"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
              <label htmlFor="gym-city" className="sr-only">
                City
              </label>
              <input
                id="gym-city"
                name="city"
                defaultValue={city}
                placeholder="City"
                className="zook-focus rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="submit"
                className="zook-focus rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
              >
                Search gyms
              </button>
            </form>
          </div>
        </GlassCard>

        {visibleGyms.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleGyms.map((gym) => (
              <Link
                key={gym.id}
                href={`/g/${gym.username}`}
                className="zook-focus block rounded-[28px]"
              >
                <GlassCard className="h-full transition hover:border-lime-300/25 hover:bg-white/[0.075]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {gym.logoUrl ? (
                        <img
                          src={gym.logoUrl}
                          alt={`${gym.name} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-lime-300/12 text-sm font-semibold text-lime-100">
                          {gym.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <h2 className="font-semibold text-white">{gym.name}</h2>
                        <p className="mt-1 flex items-center gap-1 text-xs text-white/45">
                          <MapPin size={13} />
                          {gym.city}, {gym.state}
                        </p>
                      </div>
                    </div>
                    <Pill tone="blue">{joinModeLabel(gym.joinMode)}</Pill>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(gym.amenities ?? []).slice(0, 4).map((amenity) => (
                      <Pill key={amenity}>{amenity}</Pill>
                    ))}
                  </div>
                  <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">Memberships</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {gym.priceFromPaise !== null
                        ? `Starting at ${formatInr(gym.priceFromPaise)}/month`
                        : "Plans coming soon"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {gym.planCount ? `${gym.planCount} public plans` : "Public sign-up pending"}
                    </p>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </section>
        ) : (
          <GlassCard className="text-center">
            <Pill tone="amber">No results</Pill>
            <h2 className="mt-4 text-2xl font-semibold text-white">No gyms in this city yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
              Try a different city or share Zook with your favorite gym owner.
            </p>
            <Link
              href="/start-gym"
              className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              Share with a gym owner
            </Link>
          </GlassCard>
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-3" aria-label="Gym results pages">
            {page > 1 ? (
              <Link
                href={{
                  pathname: "/gyms",
                  query: { ...(q ? { q } : {}), ...(city ? { city } : {}), page: page - 1 },
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                Previous
              </Link>
            ) : null}
            <span className="text-sm text-white/45">
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={{
                  pathname: "/gyms",
                  query: { ...(q ? { q } : {}), ...(city ? { city } : {}), page: page + 1 },
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
