import Link from "next/link";
import { AccountAwareNav } from "@/components/public/nav/account-aware-nav";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

export function PublicFooter({ locale }: { locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] py-7 text-sm text-[var(--text-tertiary)] md:flex-row md:items-center md:justify-between">
      <p>© {new Date().getFullYear()} Zook. All rights reserved.</p>
      <div className="flex flex-wrap items-center gap-4">
        <AccountAwareNav locale={locale} />
        <Link href={localizedPath("/start-gym", locale)} className="transition hover:text-[var(--text-primary)]">
          {t("startGym")}
        </Link>
        <Link href={localizedPath("/pricing", locale)} className="transition hover:text-[var(--text-primary)]">
          Pricing
        </Link>
        <Link href={localizedPath("/privacy", locale)} className="transition hover:text-[var(--text-primary)]">
          {t("privacy")}
        </Link>
        <Link href={localizedPath("/terms", locale)} className="transition hover:text-[var(--text-primary)]">
          {t("terms")}
        </Link>
        <a href="mailto:support@zookfit.in" className="transition hover:text-[var(--text-primary)]">
          {t("contact")}
        </a>
      </div>
    </footer>
  );
}
