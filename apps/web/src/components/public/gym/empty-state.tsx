import Link from "next/link";
import { GlassCard, Pill } from "@/components/glass-card";
import { localizedPath, publicT, type PublicLocale } from "@/lib/public-i18n";

export function GymNotFound({
  locale,
  username,
}: {
  locale: PublicLocale;
  username: string;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const missingProfileLabel =
    locale === "hi" ? `Gym profile नहीं मिला: ${username}` : `Missing gym profile: ${username}`;
  return (
    <main lang={locale === "hi" ? "hi-IN" : "en-IN"} className="min-h-dvh py-1">
      <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6">
        <GlassCard className="mx-auto max-w-xl text-center">
          <Pill>{t("gymNotFound")}</Pill>
          <h1 className="mt-5 text-3xl font-semibold text-[var(--text-primary)]">{t("gymNotFound")}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("gymNotFoundCopy")}</p>
          <Link
            href={localizedPath("/gyms", locale)}
            className="zook-focus mt-6 inline-flex rounded-full bg-[var(--accent-fill)] hover:bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-on-accent)] transition-colors duration-200"
          >
            {t("findGym")}
          </Link>
          <p className="sr-only">{missingProfileLabel}</p>
        </GlassCard>
      </div>
    </main>
  );
}
