import Link from "next/link";
import { MapPin } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import { formatInr } from "@/lib/format";
import { joinModeLabelForLocale, localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { GymResult } from "@/lib/public-gym-discovery";

export function GymDiscoveryGrid({
  gyms,
  locale,
}: {
  gyms: GymResult[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  if (!gyms.length) {
    return (
      <GlassCard className="text-center">
        <Pill tone="amber">{t("noResults")}</Pill>
        <h2 className="mt-4 text-2xl font-semibold text-white">{t("noGyms")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">{t("noGymsCopy")}</p>
        <ZookButtonLink href={localizedPath("/start-gym", locale)} className="mt-6">
          {t("shareGymOwner")}
        </ZookButtonLink>
      </GlassCard>
    );
  }
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {gyms.map((gym) => (
        <Link key={gym.id} href={localizedPath(`/g/${gym.username}`, locale)} className="zook-focus block rounded-[28px]">
          <GlassCard className="h-full transition hover:border-lime-300/25 hover:bg-white/[0.075]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {gym.logoUrl ? (
                  <img src={gym.logoUrl} alt={`${gym.name} logo`} loading="lazy" decoding="async" className="h-12 w-12 rounded-2xl border border-white/10 object-cover" />
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
              {(gym.amenities ?? []).slice(0, 4).map((amenity) => <Pill key={amenity}>{amenity}</Pill>)}
            </div>
            <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">{t("memberships")}</p>
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
  );
}
