import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { zookDemoFixtures } from "@zook/core";
import { MockMapProvider } from "@zook/core/providers";
import { prisma } from "@zook/db";
import { GlassCard, Pill } from "@/components/glass-card";
import { PublicNav } from "@/components/public-nav";
import { formatInr } from "@/lib/format";
import {
  alternatePublicLocale,
  joinModeLabelForLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { buildGymDiscoveryResults, type DiscoveryGym } from "@/server/gym-discovery";
import { canUsePublicDemoFallback } from "@/server/public-gym-read-models";

export const metadata: Metadata = {
  title: "Find a gym | Zook",
  description: "Search public gyms using Zook for memberships, QR entry, and member workflows.",
  alternates: { canonical: "/gyms" },
};

type GymSearchParams = Promise<{ q?: string; city?: string; page?: string; lang?: string }>;

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
      priceFromPaise: plans.filter((plan) => plan.pricePaise > 0).length
        ? Math.min(...plans.filter((plan) => plan.pricePaise > 0).map((plan) => plan.pricePaise))
        : null,
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
        priceFromPaise: orgPlans.filter((plan) => plan.pricePaise > 0).length
          ? Math.min(
              ...orgPlans.filter((plan) => plan.pricePaise > 0).map((plan) => plan.pricePaise),
            )
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
  const locale = resolvePublicLocale(query);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const page = toPositivePage(query.page);
  const gyms = await searchGyms(q, city);
  const pageSize = 50;
  const pageStart = (page - 1) * pageSize;
  const visibleGyms = gyms.slice(pageStart, pageStart + pageSize);
  const totalPages = Math.max(1, Math.ceil(gyms.length / pageSize));

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6">
        <PublicNav
          loginHref={localizedPath("/login", locale)}
          loginLabel={t("login")}
          languageHref={localizedPath("/gyms", nextLocale, { q, city, page })}
          languageLabel={t("languageSwitch")}
        />

        <GlassCard variant="strong">
          <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:items-end">
            <div>
              <Pill tone="lime">{t("gymDiscovery")}</Pill>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {t("findGymNear")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">
                {t("gymSearchCopy")}
              </p>
            </div>
            <form
              action="/gyms"
              className="grid gap-3"
            >
              {locale === "hi" ? <input type="hidden" name="lang" value="hi" /> : null}
              <label
                htmlFor="gym-search"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35"
              >
                {t("search")}
              </label>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 sm:flex-row">
                <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-4">
                  <Search size={18} className="shrink-0 text-white/35" />
                <input
                  id="gym-search"
                  name="q"
                  defaultValue={q}
                  placeholder={t("gymNamePlaceholder")}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
                </div>
              <label htmlFor="gym-city" className="sr-only">
                {t("city")}
              </label>
                <div className="h-px bg-white/10 sm:h-auto sm:w-px" />
              <input
                id="gym-city"
                name="city"
                defaultValue={city}
                placeholder={t("city")}
                  className="min-h-12 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35 sm:w-36"
              />
              <button
                type="submit"
                  className="zook-focus min-h-12 bg-lime-300 px-5 text-sm font-semibold text-black transition hover:bg-lime-200"
              >
                {t("searchGyms")}
              </button>
              </div>
            </form>
          </div>
        </GlassCard>

        {visibleGyms.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleGyms.map((gym) => (
              <Link
                key={gym.id}
                href={localizedPath(`/g/${gym.username}`, locale)}
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
                    <Pill tone="blue">{joinModeLabelForLocale(gym.joinMode, locale)}</Pill>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(gym.amenities ?? []).slice(0, 4).map((amenity) => (
                      <Pill key={amenity}>{amenity}</Pill>
                    ))}
                  </div>
                  <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      {t("memberships")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {gym.priceFromPaise !== null
                        ? `${t("startingAt")} ${formatInr(gym.priceFromPaise)}/${t("perMonth")}`
                        : "Free to join"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {gym.planCount
                        ? `${gym.planCount} ${gym.planCount === 1 ? "plan" : "plans"} available`
                        : t("publicSignupPending")}
                    </p>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </section>
        ) : (
          <GlassCard className="text-center">
            <Pill tone="amber">{t("noResults")}</Pill>
            <h2 className="mt-4 text-2xl font-semibold text-white">{t("noGyms")}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">
              {t("noGymsCopy")}
            </p>
            <Link
              href={localizedPath("/start-gym", locale)}
              className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              {t("shareGymOwner")}
            </Link>
          </GlassCard>
        )}

        {totalPages > 1 ? (
          <nav className="flex items-center justify-center gap-3" aria-label="Gym results pages">
            {page > 1 ? (
              <Link
                href={{
                  pathname: "/gyms",
                  query: {
                    ...(q ? { q } : {}),
                    ...(city ? { city } : {}),
                    ...(locale === "hi" ? { lang: "hi" } : {}),
                    page: page - 1,
                  },
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                {t("previous")}
              </Link>
            ) : null}
            <span className="text-sm text-white/45">
              {t("page")} {page} {t("of")} {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={{
                  pathname: "/gyms",
                  query: {
                    ...(q ? { q } : {}),
                    ...(city ? { city } : {}),
                    ...(locale === "hi" ? { lang: "hi" } : {}),
                    page: page + 1,
                  },
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
              >
                {t("next")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
