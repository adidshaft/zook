import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { GymNotFound } from "@/components/public/gym/empty-state";
import { GymHero } from "@/components/public/gym/hero";
import { LocationCard } from "@/components/public/gym/location-card";
import { GymMembershipCard } from "@/components/public/gym/membership-card";
import { GymProfileTabs } from "@/components/public/gym/profile-tabs";
import { StructuredData } from "@/components/public/seo/structured-data";
import { gymJsonLd, priceSummary } from "@/lib/public-gym-profile";
import { publicAbsoluteUrl } from "@/lib/public-metadata";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";
import { prisma } from "@zook/db";
import { sessionCookieName } from "@/server/context";
import { resolveSessionSummaryFromToken } from "@/server/session";

export const dynamic = "force-dynamic";

type GymPublicPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function getViewerPublicGymState(orgId: string) {
  try {
    const cookieStore = await cookies();
    const session = await resolveSessionSummaryFromToken(
      cookieStore.get(sessionCookieName)?.value,
      orgId,
    );
    if (!session) {
      return {
        initialProfileTab: "plans" as const,
        membership: null,
      };
    }

    const activeMembership = await prisma.memberSubscription.findFirst({
      where: {
        orgId,
        memberUserId: session.user.id,
        status: { in: ["PENDING_PAYMENT", "ACTIVE"] },
      },
      select: { id: true },
    });
    const membershipHref = session.user.slug
      ? `/m/${session.user.slug}`
      : session.user.privateHandle
        ? `/me/${session.user.privateHandle}`
        : "/me";

    return {
      initialProfileTab: activeMembership ? ("facilities" as const) : ("plans" as const),
      membership: activeMembership ? { active: true, href: membershipHref } : null,
    };
  } catch {
    return {
      initialProfileTab: "plans" as const,
      membership: null,
    };
  }
}

export async function generateMetadata({ params }: GymPublicPageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getPublicGymProfileData(username);
  if (!data) {
    return {
      title: "Gym not found | Zook",
      description: "Find gyms that use Zook for memberships, QR entry, and member workflows.",
    };
  }
  return {
    title: `${data.org.name} | Zook`,
    description:
      data.org.tagline ??
      `Join ${data.org.name} in ${data.org.city}. ${priceSummary(data.plans)} on Zook.`,
    alternates: { canonical: `/g/${data.org.username}` },
    openGraph: {
      title: `${data.org.name} on Zook`,
      description: `${data.org.city}, ${data.org.state} · ${priceSummary(data.plans)}`,
      type: "website",
      images: [
        {
          url:
            data.org.coverImageUrl ??
            publicAbsoluteUrl(`/g/${data.org.username}/opengraph-image`),
          alt: `${data.org.name} on Zook`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.org.name} on Zook`,
      description: `${data.org.city}, ${data.org.state} · ${priceSummary(data.plans)}`,
      images: [
        data.org.coverImageUrl ?? publicAbsoluteUrl(`/g/${data.org.username}/opengraph-image`),
      ],
    },
  };
}

export default async function GymPublicPage({ params, searchParams }: GymPublicPageProps) {
  const [{ username }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const locale = resolvePublicLocale(query);
  const nextLocale = alternatePublicLocale(locale);
  const data = await getPublicGymProfileData(username);

  if (!data) {
    return <GymNotFound locale={locale} username={username} />;
  }

  const { org, branches, plans, trainers } = data;
  const viewerPublicGymState = await getViewerPublicGymState(org.id);
  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <StructuredData data={gymJsonLd({ org, plans })} />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6">
        <PublicNav
          locale={locale}
          languageHref={localizedPath(`/g/${org.username}`, nextLocale)}
          languageLabel={publicT(locale, "languageSwitch")}
        >
          <AccountAwareNav locale={locale} />
        </PublicNav>
        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <GymHero org={org} plans={plans} branches={branches} locale={locale} />
          <GymMembershipCard
            org={org}
            plans={plans}
            locale={locale}
            viewerMembership={viewerPublicGymState.membership}
          />
        </section>
        <LocationCard org={org} branches={branches} locale={locale} />
        <GymProfileTabs
          org={org}
          plans={plans}
          trainers={trainers}
          locale={locale}
          initialTab={viewerPublicGymState.initialProfileTab}
        />
      </div>
    </main>
  );
}
