import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, QrCode, ShieldCheck, Star } from "lucide-react";
import { resolvePlanName } from "@zook/ui";
import { GlassCard, Pill } from "@/components/glass-card";
import { PublicNav } from "@/components/public-nav";
import { PublicGymActions } from "@/components/public-gym-actions";
import { ShareButton } from "@/components/share-button";
import { formatInr } from "@/lib/format";
import {
  alternatePublicLocale,
  joinModeLabelForLocale,
  localizedPath,
  publicT,
  resolvePublicLocale,
} from "@/lib/public-i18n";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";

type GymPublicPageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function priceSummary(plans: Array<{ pricePaise: number }>, locale: "en" | "hi" = "en") {
  if (!plans.length) {
    return locale === "hi" ? "सदस्यताएं अभी प्रकाशित नहीं" : "Memberships not published yet";
  }
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  if (!paidPlans.length) {
    return locale === "hi" ? "मुफ़्त ट्रायल उपलब्ध" : "Free trial available";
  }
  const minPlanPrice = Math.min(...paidPlans.map((plan) => plan.pricePaise));
  return locale === "hi"
    ? `शुरुआत ${formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/माह`
    : `Starting at ${formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/month`;
}

function trainerProfileDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { certifications: [], specialties: [] };
  }
  const record = value as Record<string, unknown>;
  const specialties = Array.isArray(record.specialties) ? record.specialties : [];
  const certifications = Array.isArray(record.certifications) ? record.certifications : [];
  return {
    certifications: certifications.filter((item): item is string => typeof item === "string"),
    specialties: specialties.filter((item): item is string => typeof item === "string"),
  };
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
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const data = await getPublicGymProfileData(username);

  if (!data) {
    return (
      <main
        lang={locale === "hi" ? "hi-IN" : "en-IN"}
        className="min-h-dvh py-1"
      >
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
          <PublicNav
            loginHref={localizedPath("/login", locale)}
            loginLabel={t("login")}
            languageHref={localizedPath(`/g/${username}`, nextLocale)}
            languageLabel={t("languageSwitch")}
          />
        <GlassCard className="mx-auto max-w-xl text-center">
          <Pill tone="amber">{t("gymNotFound")}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">{t("gymNotFound")}</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">{t("gymNotFoundCopy")}</p>
          <Link
            href={localizedPath("/gyms", locale)}
            className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
          >
            {t("findGym")}
          </Link>
        </GlassCard>
        </div>
      </main>
    );
  }
  const { org, plans, trainers } = data;
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  const minPlanPrice = paidPlans.length
    ? Math.min(...paidPlans.map((plan) => plan.pricePaise))
    : null;
  const visiblePlans = plans.slice(0, 6);
  const recommendedPlanId =
    paidPlans.find((plan) => plan.durationDays && plan.durationDays <= 45)?.id ??
    paidPlans[0]?.id ??
    plans[0]?.id;
  const hasPublicPlans = plans.length > 0;
  const gallery = org.gallery.length
    ? org.gallery
    : [org.coverImageUrl].filter((imageUrl): imageUrl is string => Boolean(imageUrl));
  const facilities = org.facilities.length ? org.facilities : org.amenities;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: org.name,
    url: `/g/${org.username}`,
    image: org.coverImageUrl ?? org.logoUrl ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: org.address,
      addressLocality: org.city,
      addressRegion: org.state,
      addressCountry: "IN",
    },
    openingHoursSpecification: org.openingHoursSummary
      ? [{ "@type": "OpeningHoursSpecification", description: org.openingHoursSummary }]
      : undefined,
    makesOffer: plans.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: minPlanPrice === null ? 0 : Math.round(minPlanPrice / 100),
          offerCount: plans.length,
        }
      : undefined,
  };

  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6">
        <PublicNav
          loginHref={localizedPath("/login", locale)}
          loginLabel={t("login")}
          languageHref={localizedPath(`/g/${org.username}`, nextLocale)}
          languageLabel={t("languageSwitch")}
        />

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="glass-panel relative min-h-[560px] overflow-hidden rounded-[32px] p-6 md:p-8">
            {org.coverImageUrl ? (
              <Image
                src={org.coverImageUrl}
                alt={`${org.name} gym interior`}
                fill
                sizes="(min-width: 1024px) calc(100vw - 430px), 100vw"
                className="object-cover opacity-30"
                priority={false}
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-black/82 via-black/62 to-black/82" />
            <div className="relative">
              {org.coverImageUrl ? (
                <div className="relative mb-5 h-48 w-full overflow-hidden rounded-2xl border border-white/10">
                  <Image
                    src={org.coverImageUrl}
                    alt={`${org.name} gym`}
                    fill
                    sizes="(min-width: 1024px) calc(100vw - 430px), 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="mb-5 flex h-32 w-full items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-zinc-950">
                  <span className="text-4xl font-black text-zinc-500">{org.name[0]}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {org.logoUrl ? (
                  <Image
                    src={org.logoUrl}
                    alt={`${org.name} logo`}
                    width={56}
                    height={56}
                    sizes="56px"
                    className="h-14 w-14 rounded-2xl border border-white/15 object-cover"
                    unoptimized
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Pill tone="lime">{joinModeLabelForLocale(org.joinMode, locale)}</Pill>
                  {org.gymType ? <Pill tone="blue">{org.gymType}</Pill> : null}
                </div>
              </div>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight text-white md:text-7xl">
                {org.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-white/58">
                <MapPin size={18} /> {org.address} · {org.city}, {org.state}
              </p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/62">
                {org.tagline || t("gymTaglineFallback")}
              </p>
              {org.openingHoursSummary ? (
                <p className="mt-3 text-sm text-lime-100/75">{org.openingHoursSummary}</p>
              ) : null}
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {org.amenities.map((amenity) => (
                <Pill key={amenity} className="border-white/15 bg-white/10 text-white/80">
                  {amenity}
                </Pill>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-6">
              {[t("choosePlan"), t("verifyEmail"), t("paySecurely")].map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-lime-300 text-xs font-bold text-black">
                    {index + 1}
                  </span>
                  <p className="text-sm text-zinc-300">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <GlassCard variant="strong" className="h-fit">
            <p className="text-sm text-white/45">{t("membershipPreview")}</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {hasPublicPlans ? priceSummary(plans, locale) : priceSummary([], locale)}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              {t("choosePlanProfile")}
            </p>
            <div className="mx-auto mt-5 w-40 rounded-[24px] border border-white/10 bg-white p-3">
              <Image
                src={`/qr/${org.username}?target=join`}
                alt={`Join ${org.name} on Zook`}
                width={160}
                height={160}
                sizes="160px"
                className="aspect-square w-full rounded-[14px]"
                unoptimized
              />
            </div>
            <p className="mt-3 text-center text-xs text-white/45">{t("scanToJoin")}</p>
            {hasPublicPlans ? (
              <Link
                href="#plans"
                className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                {t("viewPlans")}
              </Link>
            ) : (
              <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                {priceSummary([], locale)}
              </div>
            )}
            <PublicGymActions
              username={org.username}
              appStoreUrl={org.appStoreUrl}
              playStoreUrl={org.playStoreUrl}
              openLabel={t("openInApp")}
              copyLabel={t("copyJoinLink")}
              copiedLabel={t("copied")}
            />
            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-lime-200" size={22} />
                <p className="text-sm font-medium text-white">{t("securePayment")}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">{t("paymentActivation")}</p>
            </div>
          </GlassCard>
        </section>

        <section id="plans" className="grid scroll-mt-5 gap-4 lg:grid-cols-3">
          {plans.length ? (
            visiblePlans.map((plan) => (
              <Link
                key={plan.id}
                href={localizedPath(`/join/${org.username}`, locale, { plan: plan.handle })}
                className="zook-focus block rounded-[28px] transition hover:-translate-y-0.5"
              >
                <GlassCard
                  variant={plan.id === recommendedPlanId ? "selected" : "default"}
                  className="h-full transition hover:border-lime-300/25 hover:bg-white/[0.075]"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Pill tone={plan.id === recommendedPlanId ? "lime" : "neutral"}>
                        {plan.id === recommendedPlanId ? t("mostPopular") : plan.type.replaceAll("_", " ")}
                      </Pill>
                      <h2 className="mt-4 max-w-full truncate text-2xl font-semibold text-white">
                        {resolvePlanName(plan)}
                      </h2>
                    </div>
                    <p className="metric shrink-0 text-2xl font-semibold text-lime-200">
                      {formatInr(plan.pricePaise)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/52">{plan.description}</p>
                  <p className="mt-4 text-sm text-white/45">
                    {plan.durationDays
                      ? `${plan.durationDays} ${t("days")}`
                      : plan.type === "TRIAL"
                        ? t("trial")
                        : t("visitPack")}{" "}
                    · {plan.visitLimit || t("unlimited")}{" "}
                    {plan.visitLimit === 1 ? t("visit") : t("visits")}
                  </p>
                </GlassCard>
              </Link>
            ))
          ) : (
            <GlassCard className="lg:col-span-3">
              <Pill tone="amber">{t("plansComingSoon")}</Pill>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                {priceSummary([], locale)}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {t("noPublicPlanCopy")}
              </p>
            </GlassCard>
          )}
          {plans.length > visiblePlans.length ? (
            <p className="lg:col-span-3 text-sm text-white/45">
              {t("seeAllPlansPrefix")} {plans.length} {t("seeAllPlansSuffix")}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">{t("facilities")}</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {facilities.length ? (
                facilities.map((facility) => (
                  <Pill key={facility} tone="blue" className="border-white/15 bg-white/10 text-white/80">
                    {facility}
                  </Pill>
                ))
              ) : (
                <p className="text-sm text-white/50">
                  {t("facilitiesPending")}
                </p>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">{t("shareOrInstall")}</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              {t("shareInstallCopyPrefix")} {org.name}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {org.appStoreUrl ? (
                <a
                  href={org.appStoreUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                >
                  {t("appStore")}
                </a>
              ) : null}
              {org.playStoreUrl ? (
                <a
                  href={org.playStoreUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                >
                  {t("playStore")}
                </a>
              ) : null}
              <a
                href={`/qr/${org.username}?target=join&download=1`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
              >
                <QrCode size={16} />
                {t("downloadQr")}
              </a>
              <ShareButton
                title={`${org.name} on Zook`}
                text={`Join ${org.name} in ${org.city} on Zook.`}
                path={`/g/${org.username}`}
                label={t("shareJoinLink")}
              />
            </div>
          </GlassCard>
        </section>

        {gallery.length ? (
          <section className="grid gap-4 md:grid-cols-3">
            {gallery.slice(0, 6).map((imageUrl) => (
              <Image
                key={imageUrl}
                src={imageUrl}
                alt={`${org.name} facility photo`}
                width={640}
                height={480}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="aspect-[4/3] rounded-[28px] border border-white/10 object-cover"
                unoptimized
              />
            ))}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">{t("visibleTrainers")}</h2>
            <div className="mt-5 grid gap-3">
              {trainers.length ? (
                trainers.map((trainer) => {
                  const profileDetails = trainerProfileDetails(trainer.specialties);
                  return (
                    <div
                      key={trainer.userId}
                      className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4"
                    >
                      {trainer.profilePhotoUrl ? (
                        <Image
                          src={trainer.profilePhotoUrl}
                          alt={`${trainer.name} profile photo`}
                          width={44}
                          height={44}
                          sizes="44px"
                          className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-sm font-semibold text-white/72">
                          {trainer.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white">{trainer.name}</p>
                        <p className="mt-1 text-sm text-white/45">
                          {trainer.bio ?? t("bioComingSoon")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {profileDetails.specialties.slice(0, 3).map((specialty) => (
                            <Pill key={specialty}>{specialty}</Pill>
                          ))}
                          {profileDetails.certifications.slice(0, 2).map((certification) => (
                            <Pill key={certification} tone="amber">
                              {certification}
                            </Pill>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/50">
                  {t("trainersPending")}
                </p>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">{t("referral")}</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">{t("referralCopy")}</p>
            <Link
              href={localizedPath(`/join/${org.username}`, locale, { ref: "" })}
              className="zook-focus mt-5 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
            >
              {t("shareJoinLink")}
            </Link>
          </GlassCard>
        </section>
        <section>
          <GlassCard>
            <div className="flex items-center gap-3">
              <Star className="text-amber-100" size={22} />
              <h2 className="text-2xl font-semibold text-white">{t("reviews")}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/55">{t("reviewsPending")}</p>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
