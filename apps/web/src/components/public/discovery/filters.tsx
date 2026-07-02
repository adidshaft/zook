import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { GlassCard, Pill } from "@/components/glass-card";
import { joinModeLabelForLocale, localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";
import type { GymPeopleFilter, GymPriceFilter } from "@/lib/public-gym-discovery";

export function GymDiscoveryFilters({
  locale,
  q,
  city,
  people,
  price,
  resultSummary,
  pageSummary,
}: {
  locale: PublicLocale;
  q?: string | undefined;
  city?: string | undefined;
  people?: GymPeopleFilter | undefined;
  price?: GymPriceFilter | undefined;
  resultSummary: string;
  pageSummary?: string | undefined;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const hasAdvancedFilters = Boolean(people || price);
  const activeFilters = [
    people
      ? {
          label: t("people"),
          value: joinModeLabelForLocale(people, locale),
        }
      : null,
    price
      ? {
          label: t("price"),
          value: price === "FREE" ? t("freeToJoin") : t("paidPlans"),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  return (
    <GlassCard variant="strong" className="p-4 sm:p-5">
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Pill>{t("gymDiscovery")}</Pill>
            <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-white md:text-4xl">
              {t("findGymNear")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
              {resultSummary}
            </span>
            {pageSummary ? (
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-tertiary)]">
                {pageSummary}
              </span>
            ) : null}
          </div>
        </div>
        <form action="/gyms" className="grid gap-3">
          {locale === "hi" ? <input type="hidden" name="lang" value="hi" /> : null}
          <label htmlFor="gym-search" className="sr-only">
            {t("search")}
          </label>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] sm:flex-row">
            <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-4">
              <Search size={18} className="shrink-0 text-[var(--text-tertiary)]" />
              <input
                id="gym-search"
                name="q"
                defaultValue={q}
                placeholder={t("gymNamePlaceholder")}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <label htmlFor="gym-city" className="sr-only">{t("city")}</label>
            <div className="h-px bg-[var(--border)] sm:h-auto sm:w-px" />
            <input
              id="gym-city"
              name="city"
              defaultValue={city}
              placeholder={t("city")}
              className="min-h-12 bg-transparent px-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] sm:w-40"
            />
            <button type="submit" className="zook-focus min-h-12 bg-[var(--accent-fill)] px-5 text-sm font-semibold text-[var(--text-on-accent)] transition hover:bg-[var(--accent-soft)]">
              {t("searchGyms")}
            </button>
          </div>
          <details open={hasAdvancedFilters || undefined} className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2">
            <summary className="zook-focus flex cursor-pointer list-none items-center gap-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)]">
              <SlidersHorizontal size={14} aria-hidden="true" className="shrink-0 text-[var(--text-tertiary)]" />
              <span className="shrink-0">{t("filters")}</span>
              {activeFilters.length ? (
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {activeFilters.map((filter) => (
                    <span
                      key={filter.label}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                    >
                      <span className="text-[var(--text-tertiary)]">{filter.label}</span>
                      <span className="truncate">{filter.value}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="min-w-0 flex-1 truncate text-[var(--text-tertiary)]">
                  {t("allPeople")} · {t("anyPrice")}
                </span>
              )}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="shrink-0 text-[var(--text-tertiary)] transition group-open:rotate-180"
              />
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/35">{t("people")}</span>
                <select
                  name="people"
                  defaultValue={people ?? ""}
                  className="zook-focus min-h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
                >
                  <option className="bg-black" value="">{t("allPeople")}</option>
                  <option className="bg-black" value="OPEN_JOIN">
                    {joinModeLabelForLocale("OPEN_JOIN", locale)}
                  </option>
                  <option className="bg-black" value="APPROVAL_REQUIRED">
                    {joinModeLabelForLocale("APPROVAL_REQUIRED", locale)}
                  </option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/35">{t("price")}</span>
                <select
                  name="price"
                  defaultValue={price ?? ""}
                  className="zook-focus min-h-10 rounded-2xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none"
                >
                  <option className="bg-black" value="">{t("anyPrice")}</option>
                  <option className="bg-black" value="FREE">{t("freeToJoin")}</option>
                  <option className="bg-black" value="PAID">{t("paidPlans")}</option>
                </select>
              </label>
            </div>
          </details>
          {hasAdvancedFilters ? (
            <div className="-mt-1 flex justify-start">
              <Link
                href={localizedPath("/gyms", locale, { q, city })}
                className="zook-focus rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)]"
              >
                {t("clearFilters")}
              </Link>
            </div>
          ) : null}
        </form>
      </div>
    </GlassCard>
  );
}
