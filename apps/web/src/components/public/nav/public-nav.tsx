import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Pill } from "@/components/glass-card";
import { ZookButtonLink } from "@/components/zook-button";
import { ZookLogo } from "@/components/zook-logo";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

export function PublicNav({
  locale,
  languageHref,
  languageLabel,
  backHref,
  backLabel,
  children,
}: {
  locale: PublicLocale;
  languageHref?: string;
  languageLabel?: string;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-3 z-30 flex items-center justify-between rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2 pl-2">
        <ZookLogo />
        <div className="hidden md:block">
          <Pill tone="lime">
            <Sparkles size={12} />
            {publicT(locale, "indiaOps")}
          </Pill>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {languageHref ? (
          <Link
            href={languageHref}
            className="zook-focus rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
          >
            {languageLabel ?? publicT(locale, "languageSwitch")}
          </Link>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            className="zook-focus inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)]"
          >
            <ArrowLeft size={14} aria-hidden />
            {backLabel ?? publicT(locale, "home")}
          </Link>
        ) : (
          <Link
            href={localizedPath("/gyms", locale)}
            className="hidden rounded-full px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] sm:inline-flex"
          >
            {publicT(locale, "navGyms")}
          </Link>
        )}
        <div className="hidden sm:block">
          <ZookButtonLink href={localizedPath("/start-gym", locale)} size="sm">
            {publicT(locale, "startGym")}
          </ZookButtonLink>
        </div>
        {children}
      </div>
    </header>
  );
}
