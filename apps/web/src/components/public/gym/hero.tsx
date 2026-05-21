import Image from "next/image";
import { MapPin } from "lucide-react";
import { Pill } from "@/components/glass-card";
import { joinModeLabelForLocale, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGym } from "./types";

function fallbackAmenities(org: PublicGym) {
  return org.amenities.length
    ? org.amenities
    : ["Strength", "Cardio", "Personal Training", "Protein Bar", "Locker"];
}

export function GymHero({ org, locale }: { org: PublicGym; locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
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
          <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#b9f4552e,transparent_65%)]" />
            <div className="relative grid h-full place-items-center">
              <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/55 backdrop-blur">
                Cover photo coming soon
              </span>
            </div>
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
        {fallbackAmenities(org).map((amenity) => (
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
  );
}
