import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import { ZookLogo } from "@/components/zook-logo";
import { ThemeToggleButton } from "@/components/theme-preference-switcher";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

export function PublicNav({
  locale,
  languageHref,
  languageLabel,
  backHref,
  backLabel,
  hideMarketingLinks,
  children,
}: {
  locale: PublicLocale;
  languageHref?: string;
  languageLabel?: string;
  backHref?: string;
  backLabel?: string;
  hideMarketingLinks?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-3 z-30 flex min-w-0 items-center justify-between gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-2.5 py-2 backdrop-blur-xl sm:px-3">
      <div className="flex min-w-0 items-center gap-2 pl-1 sm:pl-2">
        <ZookLogo />
        {!hideMarketingLinks ? (
          <div className="hidden md:block">
            <Pill>{publicT(locale, "indiaOps")}</Pill>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggleButton locale={locale} />
        {languageHref ? (
          <Link
            href={languageHref}
            className="zook-focus rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] sm:px-3"
          >
            {languageLabel ?? publicT(locale, "languageSwitch")}
          </Link>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel ?? publicT(locale, "home")}
            title={backLabel ?? publicT(locale, "home")}
            className="zook-focus inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] sm:gap-2 sm:px-3"
          >
            <ArrowLeft size={14} aria-hidden />
            <span className="hidden sm:inline">{backLabel ?? publicT(locale, "home")}</span>
          </Link>
        ) : !hideMarketingLinks ? (
          <>
            <Link
              href={localizedPath("/pricing", locale)}
              className="hidden rounded-full px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)] hover:text-[var(--text-primary)] sm:inline-flex"
            >
              {publicT(locale, "navPricing")}
            </Link>
            <Link
              href={localizedPath("/gyms", locale)}
              className="hidden rounded-full px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] sm:inline-flex"
            >
              {publicT(locale, "navGyms")}
            </Link>
          </>
        ) : null}
        {!hideMarketingLinks ? (
          <div className="hidden sm:block">
            <ZookButtonLink href={localizedPath("/start-gym", locale)} size="sm">
              {publicT(locale, "startGym")}
            </ZookButtonLink>
          </div>
        ) : null}
        {children}
      </div>
    </header>
  );
}
