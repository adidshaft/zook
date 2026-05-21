import { MotionSurface, Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

function toneClass(tone: string) {
  if (tone === "amber") {
    return "border-amber-200/30 bg-amber-200/10 text-amber-100";
  }
  if (tone === "sky") {
    return "border-sky-200/25 bg-sky-200/10 text-sky-100";
  }
  return "border-lime-200/30 bg-lime-200/10 text-lime-200";
}

export function OperationsLoop({ locale }: { locale: PublicLocale }) {
  const { t, operationsLoop } = homeData(locale);
  return (
    <Reveal as="section" className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
      <div className="rounded-[32px] border border-white/8 bg-black/28 p-7">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-lime-200/70">
          {t("opsLoopLabel")}
        </p>
        <h2 className="mt-4 text-[clamp(1.7rem,3.2vw,2.45rem)] font-semibold leading-[1.08] text-white">
          {t("opsLoopTitle")}
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/56">{t("opsLoopCopy")}</p>
      </div>
      <Stagger className="grid gap-3 sm:grid-cols-2" gap={0.06}>
        {operationsLoop.map(({ icon: Icon, label, copy, tone }) => (
          <StaggerItem key={label}>
            <MotionSurface className="h-full rounded-[24px] border border-white/8 bg-white/[0.025] p-5 transition-colors hover:border-white/18 hover:bg-white/[0.04]">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass(tone)}`}
              >
                <Icon size={18} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-white/56">{copy}</p>
            </MotionSurface>
          </StaggerItem>
        ))}
      </Stagger>
    </Reveal>
  );
}
