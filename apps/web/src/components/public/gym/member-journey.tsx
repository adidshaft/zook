import { CalendarCheck, ChevronDown, Dumbbell, PackageCheck, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

export function MemberJourney({
  locale,
}: {
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const steps = [
    { icon: CalendarCheck, title: t("afterJoinScan"), copy: t("afterJoinScanCopy") },
    { icon: Dumbbell, title: t("afterJoinTrain"), copy: t("afterJoinTrainCopy") },
    { icon: PackageCheck, title: t("afterJoinPickup"), copy: t("afterJoinPickupCopy") },
  ];
  const compactStepSummary = steps.map((step) => step.title).join(" · ");
  return (
    <section>
      <GlassCard>
        <details className="group">
          <summary className="zook-focus flex min-h-10 cursor-pointer list-none items-center gap-3 rounded-2xl text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-[var(--border-focus)]/30 bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]">
              <ShieldCheck size={17} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold leading-6 text-[var(--text-primary)]">
                {t("afterJoining")}
              </span>
              <span className="mt-0.5 block truncate text-xs font-medium text-[var(--text-tertiary)]">
                {compactStepSummary}
              </span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, copy }) => (
              <div
                key={title}
                className="rounded-[20px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--border-focus)]/30 bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]">
                  <Icon size={19} />
                </span>
                <p className="mt-3 font-medium text-[var(--text-primary)]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
              </div>
            ))}
          </div>
        </details>
        <details className="group mt-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
          <summary className="zook-focus flex cursor-pointer list-none items-center gap-2 rounded-xl text-sm font-semibold text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent-strong)]" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{t("trustTitle")}</span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 grid gap-3 border-t border-[var(--border-subtle)] pt-3 text-sm leading-6 text-[var(--text-secondary)] md:grid-cols-2">
            <p>{t("trustCopy")}</p>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              <p className="font-medium text-[var(--text-primary)]">{t("transparentPricing")}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{t("transparentPricingCopy")}</p>
            </div>
          </div>
        </details>
      </GlassCard>
    </section>
  );
}
