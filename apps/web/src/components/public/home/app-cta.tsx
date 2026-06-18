import { ArrowUpRight, Smartphone } from "lucide-react";
import { Pill } from "@/components/glass-card";
import { Reveal } from "@/components/motion-primitives";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export function AppCta({
  locale,
  iosAppUrl,
  androidAppUrl,
}: {
  locale: PublicLocale;
  iosAppUrl?: string | undefined;
  androidAppUrl?: string | undefined;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <Reveal
      as="section"
      className="relative grid gap-5 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--bg-sunken)] px-8 py-9 md:grid-cols-[1.05fr_0.95fr] md:items-center"
    >
      <div>
        <Pill className="mb-4">
          <Smartphone size={11} />
          {t("memberApps")}
        </Pill>
        <h2 className="text-3xl font-semibold text-[var(--text-primary)] md:text-4xl">{t("memberApps")}</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">{t("memberAppsCopy")}</p>
      </div>
      <div className="flex flex-wrap justify-start gap-3 md:justify-end">
        <StoreLink href={iosAppUrl} eyebrow="Download on" label="iOS App Store" fallback={t("iosSoon")} />
        <StoreLink href={androidAppUrl} eyebrow="Get it on" label="Google Play" fallback={t("androidSoon")} />
      </div>
    </Reveal>
  );
}

function StoreLink({
  href,
  eyebrow,
  label,
  fallback,
}: {
  href?: string | undefined;
  eyebrow: string;
  label: string;
  fallback: string;
}) {
  if (!href) {
    return (
      <span className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3 text-sm font-medium text-[var(--text-tertiary)]">
        {fallback}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
    >
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{eyebrow}</span>
        <span>{label}</span>
      </span>
      <ArrowUpRight size={14} className="text-[var(--text-tertiary)] transition group-hover:text-[var(--text-primary)]" />
    </a>
  );
}
