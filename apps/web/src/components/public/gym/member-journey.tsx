import { CalendarCheck, Dumbbell, PackageCheck, ShieldCheck } from "lucide-react";
import { GlassCard, Pill } from "@/components/glass-card";
import { priceSummary } from "@/lib/public-gym-profile";
import { publicT, type PublicLocale } from "@/lib/public-i18n";
import type { PublicGymPlan } from "./types";

export function MemberJourney({
  plans,
  locale,
}: {
  plans: PublicGymPlan[];
  locale: PublicLocale;
}) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  const steps = [
    { icon: CalendarCheck, title: t("afterJoinScan"), copy: t("afterJoinScanCopy") },
    { icon: Dumbbell, title: t("afterJoinTrain"), copy: t("afterJoinTrainCopy") },
    { icon: PackageCheck, title: t("afterJoinPickup"), copy: t("afterJoinPickupCopy") },
  ];
  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <Pill>{t("afterJoining")}</Pill>
        <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{t("afterJoining")}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("afterJoiningCopy")}</p>
        <div className="mt-5 grid gap-3">
          {steps.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--border-focus)]/30 bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]">
                <Icon size={19} />
              </span>
              <div>
                <p className="font-medium text-[var(--text-primary)]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-tertiary)]">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard>
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[var(--accent)]" size={22} />
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{t("trustTitle")}</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("trustCopy")}</p>
        <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[var(--bg-sunken)]/60 p-4">
          <p className="font-medium text-[var(--text-primary)]">{t("transparentPricing")}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-tertiary)]">{t("transparentPricingCopy")}</p>
          <p className="mt-4 text-2xl font-semibold text-[var(--accent-strong)]">
            {priceSummary(plans, locale)}
          </p>
        </div>
      </GlassCard>
    </section>
  );
}
