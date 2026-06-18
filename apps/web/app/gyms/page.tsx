import type { Metadata } from "next";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { GymDiscoveryFilters } from "@/components/public/discovery/filters";
import { GymDiscoveryGrid } from "@/components/public/discovery/grid";
import { ZookButtonLink } from "@/components/zook-button";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { publicSocialImage } from "@/lib/public-metadata";
import {
  searchGyms,
  toPositivePage,
  type GymPeopleFilter,
  type GymPriceFilter,
} from "@/lib/public-gym-discovery";

export const dynamic = "force-dynamic";

const defaultMetadata: Metadata = {
  title: "Find a gym | Zook",
  description: "Search public gyms using Zook for memberships, QR entry, and member workflows.",
  alternates: { canonical: "/gyms" },
  openGraph: {
    title: "Find a gym | Zook",
    description: "Search public gyms using Zook for memberships, QR entry, and member workflows.",
    type: "website",
    images: [{ url: publicSocialImage(), alt: "Find a gym | Zook" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find a gym | Zook",
    description: "Search public gyms using Zook for memberships, QR entry, and member workflows.",
    images: [publicSocialImage()],
  },
};

type GymSearchParams = Promise<{
  q?: string;
  city?: string;
  people?: string;
  price?: string;
  page?: string;
  lang?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: GymSearchParams;
}): Promise<Metadata> {
  const query = await searchParams;
  const city = query.city?.trim();
  const q = query.q?.trim();
  if (!city && !q) {
    return defaultMetadata;
  }
  const title = city
    ? `Find gyms in ${city} | Zook`
    : q
      ? `Search gyms for "${q}" | Zook`
      : "Find a gym | Zook";
  const description = city
    ? `Search public Zook gyms in ${city} for memberships, QR entry, and member workflows.`
    : q
      ? `Search public Zook gyms matching "${q}" for memberships, QR entry, and member workflows.`
      : defaultMetadata.description ?? "";
  return {
    title,
    description,
    alternates: {
      canonical: city ? `/gyms?city=${encodeURIComponent(city)}` : q ? `/gyms?q=${encodeURIComponent(q)}` : "/gyms",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: publicSocialImage(), alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [publicSocialImage()],
    },
  };
}

export default async function GymsPage({ searchParams }: { searchParams: GymSearchParams }) {
  const query = await searchParams;
  const q = query.q?.trim() || undefined;
  const city = query.city?.trim() || undefined;
  const people = resolvePeopleFilter(query.people);
  const price = resolvePriceFilter(query.price);
  const locale = resolvePublicLocale(query);
  const nextLocale = alternatePublicLocale(locale);
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const page = toPositivePage(query.page);
  const gyms = await searchGyms(q, city, {
    ...(people ? { people } : {}),
    ...(price ? { price } : {}),
  });
  const pageSize = 50;
  const pageStart = (page - 1) * pageSize;
  const visibleGyms = gyms.slice(pageStart, pageStart + pageSize);
  const totalPages = Math.max(1, Math.ceil(gyms.length / pageSize));

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6">
        <PublicNav
          locale={locale}
          languageHref={localizedPath("/gyms", nextLocale, { q, city, people, price, page })}
          languageLabel={t("languageSwitch")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <GymDiscoveryFilters locale={locale} q={q} city={city} people={people} price={price} />
        <GymDiscoveryGrid gyms={visibleGyms} locale={locale} />
        <GymPagination
          page={page}
          totalPages={totalPages}
          locale={locale}
          q={q}
          city={city}
          people={people}
          price={price}
        />
      </div>
    </main>
  );
}

function GymPagination({
  page,
  totalPages,
  locale,
  q,
  city,
  people,
  price,
}: {
  page: number;
  totalPages: number;
  locale: "en" | "hi";
  q?: string | undefined;
  city?: string | undefined;
  people?: GymPeopleFilter | undefined;
  price?: GymPriceFilter | undefined;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  if (totalPages <= 1) return null;
  const pageHref = (nextPage: number) => ({
    pathname: "/gyms",
    query: {
      ...(q ? { q } : {}),
      ...(city ? { city } : {}),
      ...(people ? { people } : {}),
      ...(price ? { price } : {}),
      ...(locale === "hi" ? { lang: "hi" } : {}),
      page: nextPage,
    },
  });
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Gym results pages">
      {page > 1 ? <ZookButtonLink tone="ghost" size="sm" href={pageHref(page - 1)}>{t("previous")}</ZookButtonLink> : null}
      <span className="text-sm text-white/45">{t("page")} {page} {t("of")} {totalPages}</span>
      {page < totalPages ? <ZookButtonLink tone="ghost" size="sm" href={pageHref(page + 1)}>{t("next")}</ZookButtonLink> : null}
    </nav>
  );
}

function resolvePeopleFilter(value?: string): GymPeopleFilter | undefined {
  return value === "OPEN_JOIN" || value === "APPROVAL_REQUIRED" ? value : undefined;
}

function resolvePriceFilter(value?: string): GymPriceFilter | undefined {
  return value === "FREE" || value === "PAID" ? value : undefined;
}
