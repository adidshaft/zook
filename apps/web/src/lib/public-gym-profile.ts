import { formatInr } from "@/lib/format";

export function priceSummary(plans: Array<{ pricePaise: number }>, locale: "en" | "hi" = "en") {
  if (!plans.length) {
    return locale === "hi" ? "सदस्यताएं अभी प्रकाशित नहीं" : "Memberships not published yet";
  }
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  if (!paidPlans.length) {
    return locale === "hi" ? "मुफ़्त ट्रायल उपलब्ध" : "Free trial available";
  }
  const minPlanPrice = Math.min(...paidPlans.map((plan) => plan.pricePaise));
  return locale === "hi"
    ? `शुरुआत ${formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/माह`
    : `Starting at ${formatInr(Number.isFinite(minPlanPrice) ? minPlanPrice : 0)}/month`;
}

export function trainerProfileDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { certifications: [], specialties: [] };
  }
  const record = value as Record<string, unknown>;
  const specialties = Array.isArray(record.specialties) ? record.specialties : [];
  const certifications = Array.isArray(record.certifications) ? record.certifications : [];
  return {
    certifications: certifications.filter((item): item is string => typeof item === "string"),
    specialties: specialties.filter((item): item is string => typeof item === "string"),
  };
}

export function gymJsonLd({
  org,
  plans,
}: {
  org: {
    name: string;
    username: string;
    coverImageUrl?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    openingHoursSummary?: string | null;
  };
  plans: Array<{ pricePaise: number }>;
}) {
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  const minPlanPrice = paidPlans.length ? Math.min(...paidPlans.map((plan) => plan.pricePaise)) : 0;
  return {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: org.name,
    url: `/g/${org.username}`,
    image: org.coverImageUrl ?? org.logoUrl ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: org.address,
      addressLocality: org.city,
      addressRegion: org.state,
      addressCountry: "IN",
    },
    openingHoursSpecification: org.openingHoursSummary
      ? [{ "@type": "OpeningHoursSpecification", description: org.openingHoursSummary }]
      : undefined,
    makesOffer: plans.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.round(minPlanPrice / 100),
          offerCount: plans.length,
        }
      : undefined,
  };
}
