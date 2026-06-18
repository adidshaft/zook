import type { PublicLocale } from "@/lib/public-i18n";

export type PublicPlanLabelInput = {
  durationDays: number | null;
  type: string;
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
