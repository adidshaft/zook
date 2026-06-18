import type { PublicLocale } from "@/lib/public-i18n";

export type PublicPlanLabelInput = {
  durationDays: number | null;
  type: string;
};

export type PublicPlanValiditySummaryInput = {
  durationDays: number | null;
  visitLimit: number | null;
};

export function planValidityLabel(plan: PublicPlanLabelInput, locale: PublicLocale) {
  if (plan.durationDays) {
    return locale === "hi" ? `${plan.durationDays} दिन` : `${plan.durationDays} days`;
  }
  if (plan.type === "TRIAL") {
    return locale === "hi" ? "ट्रायल एक्सेस" : "Trial access";
  }
  return locale === "hi" ? "विज़िट पैक" : "Visit pack";
}

export function planVisitLabel(visitLimit: number | null, locale: PublicLocale) {
  if (!visitLimit) {
    return locale === "hi" ? "असीमित विज़िट" : "Unlimited visits";
  }
  return locale === "hi"
    ? `${visitLimit} विज़िट`
    : `${visitLimit} ${visitLimit === 1 ? "visit" : "visits"}`;
}

export function planValiditySummaryLabel(
  plan: PublicPlanValiditySummaryInput,
  locale: PublicLocale,
) {
  const parts = [
    plan.durationDays ? `${plan.durationDays} ${locale === "hi" ? "दिन" : "days"}` : null,
    plan.visitLimit
      ? locale === "hi"
        ? `${plan.visitLimit} विज़िट`
        : `${plan.visitLimit} visit${plan.visitLimit === 1 ? "" : "s"}`
      : locale === "hi"
        ? "असीमित विज़िट"
        : "Unlimited visits",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : locale === "hi" ? "जिम की निर्धारित वैधता" : "Gym-defined validity";
}
