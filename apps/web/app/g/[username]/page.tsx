import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, QrCode, ShieldCheck, Smartphone, Star } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ShareButton } from "@/components/share-button";
import { ZookLogo } from "@/components/zook-logo";
import { formatInr, joinModeLabel } from "@/lib/format";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";

type GymPublicPageProps = { params: Promise<{ username: string }> };

function priceSummary(plans: Array<{ pricePaise: number }>) {
  if (!plans.length) {
    return "Memberships not published yet";
  }
  const minPlanPrice = Math.min(...plans.map((plan) => plan.pricePaise));
  return `Starting at ${formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/month`;
}

function trainerTags(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const record = value as Record<string, unknown>;
  const raw = [
    ...(Array.isArray(record.specialties) ? record.specialties : []),
    ...(Array.isArray(record.certifications) ? record.certifications : []),
  ];
  return raw.filter((item): item is string => typeof item === "string").slice(0, 4);
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

export default async function GymPublicPage({ params }: GymPublicPageProps) {
  const { username } = await params;
  const data = await getPublicGymProfileData(username);

  if (!data) {
    return (
      <main className="grid min-h-dvh place-items-center px-5 py-8">
        <GlassCard className="max-w-xl text-center">
          <Pill tone="amber">Gym not found</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-white">Gym not found</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            This link may be expired or the gym may have moved.
          </p>
          <Link
            href="/gyms"
            className="zook-focus mt-6 inline-flex rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-black"
          >
            Find gyms
          </Link>
        </GlassCard>
      </main>
    );
  }
  const { org, plans, trainers } = data;
  const minPlanPrice = Math.min(...plans.map((plan) => plan.pricePaise));
  const defaultPlanId = plans[0]?.id;
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
          lowPrice: Math.round(minPlanPrice / 100),
          offerCount: plans.length,
        }
      : undefined,
  };

  return (
    <main className="min-h-dvh px-5 py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <ZookLogo />
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70"
            >
              Login
            </Link>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="glass-panel relative min-h-[560px] overflow-hidden rounded-[32px] p-6 md:p-8">
            {org.coverImageUrl ? (
              <img
                src={org.coverImageUrl}
                alt={`${org.name} gym interior`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-br from-black/82 via-black/62 to-black/82" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt={`${org.name} logo`}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-2xl border border-white/15 object-cover"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Pill tone="lime">{joinModeLabel(org.joinMode)}</Pill>
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
                {org.tagline ||
                  "Join this gym, choose a plan, check in with QR, follow assigned plans, and pick up desk orders through Zook."}
              </p>
              {org.openingHoursSummary ? (
                <p className="mt-3 text-sm text-lime-100/75">{org.openingHoursSummary}</p>
              ) : null}
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {org.amenities.map((amenity) => (
                <Pill key={amenity}>{amenity}</Pill>
              ))}
            </div>
            <div className="mt-10 grid gap-3 md:grid-cols-3">
              {["Choose plan", "Verify email", "Pay securely"].map((step, index) => (
                <div key={step} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase text-white/35">Step {index + 1}</p>
                  <p className="mt-2 font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <GlassCard variant="strong" className="h-fit">
            <p className="text-sm text-white/45">Membership preview</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              {hasPublicPlans ? priceSummary(plans) : "Memberships not published yet"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Choose a plan here, then continue in Zook for check-ins, workouts, notifications, and
              desk pickup.
            </p>
            <div className="mt-5 rounded-[28px] border border-white/10 bg-white p-4">
              <img
                src={`/qr/${org.username}?target=join`}
                alt={`Join ${org.name} on Zook`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-[18px]"
              />
            </div>
            {hasPublicPlans ? (
              <Link
                href={`/join/${org.username}${defaultPlanId ? `?plan=${defaultPlanId}` : ""}`}
                className="zook-focus mt-6 inline-flex w-full justify-center rounded-full bg-lime-300 px-5 py-3 font-semibold text-black"
              >
                Join Now
              </Link>
            ) : (
              <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
                This gym has not published a public membership plan yet.
              </div>
            )}
            <a
              href={`zook://join/${org.username}`}
              className="zook-focus mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-white/72"
            >
              <Smartphone size={17} />
              Open in app
            </a>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-lime-200" size={22} />
                <p className="text-sm font-medium text-white">Secure payment</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                Your membership is activated after payment confirmation.
              </p>
            </div>
          </GlassCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.length ? (
            plans.map((plan) => (
              <Link
                key={plan.id}
                href={`/join/${org.username}?plan=${plan.id}`}
                className="zook-focus block rounded-[28px] transition hover:-translate-y-0.5"
              >
                <GlassCard className="h-full transition hover:border-lime-300/25 hover:bg-white/[0.075]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Pill tone={plan.id === "plan-hybrid-pro" ? "lime" : "neutral"}>
                        {plan.type.replaceAll("_", " ")}
                      </Pill>
                      <h2 className="mt-4 text-2xl font-semibold text-white">{plan.name}</h2>
                    </div>
                    <p className="metric text-2xl font-semibold text-lime-200">
                      {formatInr(plan.pricePaise)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/52">{plan.description}</p>
                  <p className="mt-4 text-sm text-white/45">
                    {plan.durationDays
                      ? `${plan.durationDays} days`
                      : plan.type === "TRIAL"
                        ? "Trial"
                        : "Visit pack"}{" "}
                    · {plan.visitLimit || "Unlimited"} {plan.visitLimit === 1 ? "visit" : "visits"}
                  </p>
                </GlassCard>
              </Link>
            ))
          ) : (
            <GlassCard className="lg:col-span-3">
              <Pill tone="amber">Plans unavailable</Pill>
              <h2 className="mt-4 text-2xl font-semibold text-white">No public plans yet</h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                This gym can still use Zook internally, but public sign-up starts only after an
                owner publishes a membership plan.
              </p>
            </GlassCard>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Facilities</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {facilities.length ? (
                facilities.map((facility) => (
                  <Pill key={facility} tone="blue">
                    {facility}
                  </Pill>
                ))
              ) : (
                <p className="text-sm text-white/50">
                  Facilities will appear once the gym publishes them.
                </p>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Share or install</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Scan the QR, open this gym in Zook, or install the app and search for {org.name}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {org.appStoreUrl ? (
                <a
                  href={org.appStoreUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                >
                  App Store
                </a>
              ) : null}
              {org.playStoreUrl ? (
                <a
                  href={org.playStoreUrl}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
                >
                  Play Store
                </a>
              ) : null}
              <a
                href={`/qr/${org.username}?target=join&download=1`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
              >
                <QrCode size={16} />
                Download QR
              </a>
              <ShareButton
                title={`${org.name} on Zook`}
                text={`Join ${org.name} in ${org.city} on Zook.`}
                path={`/g/${org.username}`}
              />
            </div>
          </GlassCard>
        </section>

        {gallery.length ? (
          <section className="grid gap-4 md:grid-cols-3">
            {gallery.slice(0, 6).map((imageUrl) => (
              <img
                key={imageUrl}
                src={imageUrl}
                alt={`${org.name} facility photo`}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] rounded-[28px] border border-white/10 object-cover"
              />
            ))}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Visible trainers</h2>
            <div className="mt-5 grid gap-3">
              {trainers.length ? (
                trainers.map((trainer) => (
                  <div
                    key={trainer.userId}
                    className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4"
                  >
                    {trainer.profilePhotoUrl ? (
                      <img
                        src={trainer.profilePhotoUrl}
                        alt={`${trainer.name} profile photo`}
                        loading="lazy"
                        decoding="async"
                        className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium text-white">{trainer.name}</p>
                      <p className="mt-1 text-sm text-white/45">
                        {trainer.bio ?? "Trainer details will appear after the gym publishes them."}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {trainerTags(trainer.specialties).map((tag) => (
                          <Pill key={tag}>{tag}</Pill>
                        ))}
                        <Pill tone="blue">Available for PT</Pill>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/50">
                  Trainer profiles will appear after the gym publishes them.
                </p>
              )}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-2xl font-semibold text-white">Referral</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Have a referral or invite code? Apply it during payment so the gym can track the
              source and any eligible discount.
            </p>
          </GlassCard>
        </section>
        <section>
          <GlassCard>
            <div className="flex items-center gap-3">
              <Star className="text-amber-100" size={22} />
              <h2 className="text-2xl font-semibold text-white">Reviews</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Member reviews will appear here after this gym starts collecting feedback through
              Zook.
            </p>
          </GlassCard>
        </section>
      </div>
    </main>
  );
}
