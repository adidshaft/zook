import { Reveal } from "@/components/motion-primitives";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export function IndiaOpsBand({ locale }: { locale: PublicLocale }) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return (
    <Reveal
      as="section"
      className="relative overflow-hidden rounded-[32px] border border-white/8 bg-gradient-to-br from-lime-300/[0.06] via-transparent to-amber-200/[0.04] px-8 py-12 text-center"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
        {t("indiaOps")}
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-[clamp(1.1rem,2vw,1.5rem)] leading-[1.55] text-white/78">
        {t("indiaOpsCopy")}
      </p>
    </Reveal>
  );
}
