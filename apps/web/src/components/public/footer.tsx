import Link from "next/link";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

export function PublicFooter({ locale }: { locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <footer className="flex flex-col gap-4 border-t border-[var(--border-subtle)] py-6 text-sm text-[var(--text-tertiary)] md:flex-row md:items-center md:justify-between">
      <p>© {new Date().getFullYear()} Zook. {t("allRightsReserved")}</p>
      <nav aria-label={t("contact")} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={localizedPath("/privacy", locale)} className="transition hover:text-[var(--text-primary)]">
          {t("privacy")}
        </Link>
        <Link href={localizedPath("/terms", locale)} className="transition hover:text-[var(--text-primary)]">
          {t("terms")}
        </Link>
        <a href="mailto:support@zookfit.in" className="transition hover:text-[var(--text-primary)]">
          {t("contact")}
        </a>
      </nav>
    </footer>
  );
}
