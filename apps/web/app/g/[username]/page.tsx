import type { Metadata } from "next";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { PublicNav } from "@/components/public/nav/public-nav";
import { GymNotFound } from "@/components/public/gym/empty-state";
import { GymHero } from "@/components/public/gym/hero";
import { GymMembershipCard } from "@/components/public/gym/membership-card";
import { GymProfileTabs } from "@/components/public/gym/profile-tabs";
import { StructuredData } from "@/components/public/seo/structured-data";
import { gymJsonLd, priceSummary } from "@/lib/public-gym-profile";
import {
  alternatePublicLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";

export const revalidate = 600;

type GymPublicPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
      images: data.org.coverImageUrl ? [{ url: data.org.coverImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.org.name} on Zook`,
      description: `${data.org.city}, ${data.org.state} · ${priceSummary(data.plans)}`,
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

  const { org, plans, trainers } = data;
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
          <GymHero org={org} locale={locale} />
          <GymMembershipCard org={org} plans={plans} locale={locale} />
        </section>
        <GymProfileTabs org={org} plans={plans} trainers={trainers} locale={locale} />
      </div>
    </main>
  );
}
