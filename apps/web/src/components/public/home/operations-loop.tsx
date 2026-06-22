import { MotionSurface, Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";
import { type PublicLocale } from "@/lib/public-i18n";
import { homeData } from "./home-data";

function toneClass(tone: "neutral" | "info") {
  if (tone === "info") {
    return "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]";
  }
  return "border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]";
}

export function OperationsLoop({ locale }: { locale: PublicLocale }) {
  const { t, operationsLoop } = homeData(locale);
  return (
    <Reveal as="section" className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start text-[var(--text-primary)]">
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--bg-sunken)] p-7">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--accent-strong)]">
          {t("opsLoopLabel")}
        </p>
        <h2 className="mt-4 text-[clamp(1.7rem,3.2vw,2.45rem)] font-semibold leading-[1.08] text-[var(--text-primary)]">
          {t("opsLoopTitle")}
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{t("opsLoopCopy")}</p>
      </div>
      <Stagger className="grid gap-3 sm:grid-cols-2" gap={0.06}>
        {operationsLoop.map(({ icon: Icon, label, copy, tone }) => (
          <StaggerItem key={label}>
            <MotionSurface className="h-full rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass(tone)}`}
              >
                <Icon size={18} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
            </MotionSurface>
          </StaggerItem>
        ))}
      </Stagger>
    </Reveal>
  );
}
