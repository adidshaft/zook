import { MotionSurface, Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

export function ProofStrip({ locale }: { locale: PublicLocale }) {
  const { t, proofPoints } = homeData(locale);
  return (
    <Reveal
      as="section"
      className="relative overflow-hidden rounded-[32px] border border-white/8 bg-black/30 px-8 py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-lime-200/30 to-transparent"
      />
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-200/70">
            {t("socialProof")}
          </p>
          <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)] font-semibold leading-[1.05]">
            {t("socialTitle")}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/55">{t("socialCopy")}</p>
        </div>
        <Stagger className="grid gap-3" gap={0.1}>
          {proofPoints.map((point, idx) => (
            <StaggerItem key={point}>
              <MotionSurface className="flex items-start gap-4 rounded-[20px] border border-white/8 bg-white/[0.025] p-4 text-sm leading-6 text-white/72 transition-colors hover:border-lime-200/20 hover:bg-white/[0.04]">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-200/30 bg-lime-200/10 text-[11px] font-semibold text-lime-200">
                  0{idx + 1}
                </span>
                <span>{point}</span>
              </MotionSurface>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Reveal>
  );
}
