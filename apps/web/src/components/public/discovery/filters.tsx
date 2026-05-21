import { Search } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export function GymDiscoveryFilters({
  locale,
  q,
  city,
}: {
  locale: PublicLocale;
  q?: string | undefined;
  city?: string | undefined;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <GlassCard variant="strong">
      <div className="grid gap-6 lg:grid-cols-[1fr_440px] lg:items-end">
        <div>
          <Pill tone="lime">{t("gymDiscovery")}</Pill>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {t("findGymNear")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/58">{t("gymSearchCopy")}</p>
        </div>
        <form action="/gyms" className="grid gap-3">
          {locale === "hi" ? <input type="hidden" name="lang" value="hi" /> : null}
          <label htmlFor="gym-search" className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
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
            <label htmlFor="gym-city" className="sr-only">{t("city")}</label>
            <div className="h-px bg-white/10 sm:h-auto sm:w-px" />
            <input
              id="gym-city"
              name="city"
              defaultValue={city}
              placeholder={t("city")}
              className="min-h-12 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35 sm:w-36"
            />
            <button type="submit" className="zook-focus min-h-12 bg-lime-300 px-5 text-sm font-semibold text-black transition hover:bg-lime-200">
              {t("searchGyms")}
            </button>
          </div>
        </form>
      </div>
    </GlassCard>
  );
}
