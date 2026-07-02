import type { PublicLocale } from "@/lib/public-i18n";

export type PublicPlanLabelInput = {
  durationDays: number | null;
  type: string;
};

export type PublicPlanValiditySummaryInput = {
  durationDays: number | null;
  visitLimit: number | null;
};

const knownHindiPlanDescriptions = new Map([
  ["one supervised visit for new members.", "नए सदस्यों के लिए ट्रेनर की निगरानी में एक विज़िट."],
  [
    "30 days of gym access for regular training.",
    "नियमित ट्रेनिंग के लिए 30 दिन का जिम एक्सेस.",
  ],
  [
    "30 days with 12 visits and coach plan access.",
    "30 दिन, 12 विज़िट और कोचिंग प्लान का एक्सेस शामिल.",
  ],
  [
    "30 days of gym access with approval before activation.",
    "एक्टिवेशन से पहले स्वीकृति के साथ 30 दिन का जिम एक्सेस.",
  ],
  [
    "8 coached group sessions for functional training.",
    "फंक्शनल ट्रेनिंग के लिए 8 कोच-लेड ग्रुप सेशन.",
  ],
]);

const knownHindiPlanNames = new Map([
  ["trial pass", "ट्रायल पास"],
  ["monthly active", "मंथली एक्टिव"],
  ["hybrid pro", "हाइब्रिड प्रो"],
  ["starter month", "स्टार्टर मंथ"],
  ["class pack", "क्लास पैक"],
]);

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

export function planDescriptionLabel(description: string | null | undefined, locale: PublicLocale) {
  const value = description?.trim();
  if (!value) return null;
  if (locale !== "hi") return value;
  return knownHindiPlanDescriptions.get(value.toLowerCase()) ?? value;
}

export function planNameLabel(name: string | null | undefined, locale: PublicLocale) {
  const value = name?.trim();
  if (!value) return "";
  if (locale !== "hi") return value;
  return knownHindiPlanNames.get(value.toLowerCase()) ?? value;
}
