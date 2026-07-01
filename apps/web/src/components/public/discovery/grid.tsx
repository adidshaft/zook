import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { AvatarInitials } from "@/components/dashboard-primitives";
import { GlassCard, Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import { priceSummary, publicGymDisplayIdentity } from "@/lib/public-gym-profile";
import { joinModeLabelForLocale, joinModeTone, localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { GymResult } from "@/lib/public-gym-discovery";

function gymLocationLine(gym: GymResult) {
  return (
    publicGymDisplayIdentity({
      address: gym.address ?? null,
      city: gym.city,
      orgName: gym.name,
      state: gym.state,
    }).subtitle ?? gym.city
  );
}

export function GymDiscoveryGrid({
  gyms,
  locale,
}: {
  gyms: GymResult[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const coverAlt = (name: string) => (locale === "hi" ? `${name} की कवर तस्वीर` : `${name} cover`);
  const logoAlt = (name: string) => (locale === "hi" ? `${name} लोगो` : `${name} logo`);
  const openLabel = (planCount: number) => (planCount ? t("viewMemberships") : t("viewGym"));
  const planCountLabel = (count: number) =>
    count
      ? locale === "hi"
        ? `${count} ${t("publicPlans")}`
        : `${count} ${count === 1 ? "plan" : "plans"}`
      : t("publicSignupPending");
  if (!gyms.length) {
    return (
      <GlassCard className="text-center">
        <Pill>{t("noResults")}</Pill>
        <h2 className="mt-4 text-2xl font-semibold text-white">{t("noGyms")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">{t("noGymsCopy")}</p>
        <ZookButtonLink href={localizedPath("/start-gym", locale)} className="mt-6">
          {t("shareGymOwner")}
        </ZookButtonLink>
      </GlassCard>
    );
  }
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {gyms.map((gym) => {
        const primaryPrice =
          gym.priceFromPaise !== null ? priceSummary(gym.priceSummaryPlans, locale) : t("freeToJoin");
        const locationLine = gymLocationLine(gym);
        const profileHref = localizedPath(`/g/${gym.username}`, locale);
        const primaryHref = gym.planCount ? localizedPath(`/join/${gym.username}`, locale) : profileHref;
        return (
          <GlassCard
            key={gym.id}
            className="group grid h-full overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:border-lime-300/25 hover:bg-white/[0.075]"
          >
            <div className="relative h-28 overflow-hidden bg-white/[0.03] sm:h-32">
              {gym.coverImageUrl ? (
                <img
                  src={gym.coverImageUrl}
                  alt={coverAlt(gym.name)}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-end bg-[radial-gradient(circle_at_22%_18%,rgba(190,242,100,0.20),transparent_34%),linear-gradient(135deg,rgba(190,242,100,0.10),rgba(255,255,255,0.03))] px-5">
                  <AvatarInitials
                    name={gym.name}
                    className="h-20 w-20 rounded-[28px] border-white/10 bg-white/[0.06] text-2xl text-lime-100/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/52 via-black/10 to-black/5" />
              <div className="absolute right-3 top-3">
                <Pill tone={joinModeTone(gym.joinMode)} className="bg-black/45 backdrop-blur">
                  {joinModeLabelForLocale(gym.joinMode, locale)}
                </Pill>
              </div>
            </div>
            <div className="grid gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                {gym.logoUrl ? (
                  <img
                    src={gym.logoUrl}
                    alt={logoAlt(gym.name)}
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-2xl border border-white/12 bg-black/25 object-cover shadow-sm"
                  />
                ) : (
                  <AvatarInitials
                    name={gym.name}
                    className="h-12 w-12 shrink-0 rounded-2xl border-white/12 bg-lime-300/14 text-sm text-lime-100 shadow-sm"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-base font-semibold leading-tight text-white">
                    {gym.name}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-xs font-medium text-white/55">
                    {locationLine}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 border-t border-white/8 pt-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-snug text-white">
                    {primaryPrice}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/45">{planCountLabel(gym.planCount)}</p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Link
                    href={primaryHref}
                    aria-label={`${openLabel(gym.planCount)}: ${gym.name}`}
                    className="zook-focus inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-lime-300 px-4 text-sm font-semibold text-black transition hover:bg-lime-200 active:scale-[0.99]"
                  >
                    <span className="truncate">{openLabel(gym.planCount)}</span>
                    <ArrowRight size={16} aria-hidden className="shrink-0" />
                  </Link>
                  {gym.planCount ? (
                    <Link
                      href={profileHref}
                      aria-label={`${t("viewGym")}: ${gym.name}`}
                      className="zook-focus inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                    >
                      <Eye size={16} aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </section>
  );
}
