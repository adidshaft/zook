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
      className="relative grid gap-5 overflow-hidden rounded-[32px] border border-white/8 bg-black/30 px-8 py-9 md:grid-cols-[1.05fr_0.95fr] md:items-center"
    >
      <div>
        <Pill tone="amber" className="mb-4">
          <Smartphone size={11} />
          {t("memberApps")}
        </Pill>
        <h2 className="text-3xl font-semibold text-white md:text-4xl">{t("memberApps")}</h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/55">{t("memberAppsCopy")}</p>
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
      <span className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/55">
        {fallback}
      </span>
    );
  }
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/8 hover:text-white"
    >
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">{eyebrow}</span>
        <span>{label}</span>
      </span>
      <ArrowUpRight size={14} className="text-white/40 transition group-hover:text-white" />
    </a>
  );
}
