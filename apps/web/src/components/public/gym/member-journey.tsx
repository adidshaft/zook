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
        <Pill tone="lime">{t("afterJoining")}</Pill>
        <h2 className="mt-4 text-2xl font-semibold text-white">{t("afterJoining")}</h2>
        <p className="mt-3 text-sm leading-6 text-white/55">{t("afterJoiningCopy")}</p>
        <div className="mt-5 grid gap-3">
          {steps.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="flex gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-lime-200/20 bg-lime-200/10 text-lime-100">
                <Icon size={19} />
              </span>
              <div>
                <p className="font-medium text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-white/52">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard>
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-lime-200" size={22} />
          <h2 className="text-2xl font-semibold text-white">{t("trustTitle")}</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/55">{t("trustCopy")}</p>
        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="font-medium text-white">{t("transparentPricing")}</p>
          <p className="mt-2 text-sm leading-6 text-white/52">{t("transparentPricingCopy")}</p>
          <p className="mt-4 text-2xl font-semibold text-lime-100">
            {priceSummary(plans, locale)}
          </p>
        </div>
      </GlassCard>
    </section>
  );
}
