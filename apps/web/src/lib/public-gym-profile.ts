import { formatInr } from "@/lib/format";
import { publicAbsoluteUrl } from "./public-metadata";

export function priceSummary(
  plans: Array<{ pricePaise: number; durationDays?: number | null; type?: string | null }>,
  locale: "en" | "hi" = "en",
) {
  if (!plans.length) {
    return locale === "hi" ? "सदस्यताएं प्रकाशित नहीं" : "Memberships not published";
  }
  const paidPlans = plans.filter((plan) => plan.pricePaise > 0);
  if (!paidPlans.length) {
    return locale === "hi" ? "मुफ़्त ट्रायल उपलब्ध" : "Free trial available";
  }
  const membershipPlans = paidPlans.filter((plan) => plan.type !== "TRIAL");
  const cheapestPlan = [...(membershipPlans.length ? membershipPlans : paidPlans)].sort(
    (a, b) => a.pricePaise - b.pricePaise,
  )[0];
  const amount = formatInr(cheapestPlan?.pricePaise ?? 0);
  const duration = cheapestPlan?.durationDays
    ? locale === "hi"
      ? `${cheapestPlan.durationDays} दिन`
      : `${cheapestPlan.durationDays} days`
    : null;
  if (duration) {
    return locale === "hi" ? `शुरुआत ${amount} · ${duration}` : `Starting at ${amount} · ${duration}`;
  }
  return locale === "hi" ? `शुरुआत ${amount}` : `Starting at ${amount}`;
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

export function publicGymDisplayIdentity({
  address,
  branchName,
  city,
  orgName,
  state,
}: {
  address?: string | null;
  branchName?: string | null;
  city?: string | null;
  orgName: string;
  state?: string | null;
}) {
  const title = orgName.trim() || branchName?.trim() || "Gym";
  const cityValue = city?.trim() || null;
  const locality = publicGymLocality({
    address: address ?? null,
    branchName: branchName ?? null,
    city: cityValue,
    orgName: title,
  });
  const subtitle = compactLocationParts([locality, cityValue]) ?? state?.trim() ?? null;
  return { title, subtitle };
}

function publicGymLocality({
  address,
  branchName,
  city,
  orgName,
}: {
  address?: string | null;
  branchName?: string | null;
  city?: string | null;
  orgName?: string | null;
}) {
  const fromBranch = stripSharedGymPrefix(orgName, branchName);
  if (fromBranch) return fromBranch;
  const cityValue = city?.trim().toLowerCase();
  const laneLike = /^(lane|road|rd|street|st|plot|shop|unit|floor|fl|no\.?|#)\b/i;
  const parts =
    address
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];
  return (
    parts.find((part) => part.toLowerCase() !== cityValue && !laneLike.test(part)) ??
    parts.find((part) => part.toLowerCase() !== cityValue) ??
    null
  );
}

function stripSharedGymPrefix(
  orgName: string | null | undefined,
  branchName: string | null | undefined,
) {
  const org = orgName?.trim();
  const branch = branchName?.trim();
  if (!branch) return null;
  if (org && branch.toLowerCase().startsWith(org.toLowerCase())) {
    const stripped = branch.slice(org.length).replace(/^[\s\-·,]+/, "").trim();
    if (stripped) return stripped;
  }
  const orgLead = org?.split(/\s+/)[0];
  if (orgLead && branch.toLowerCase().startsWith(`${orgLead.toLowerCase()} `)) {
    return branch.slice(orgLead.length).trim() || branch;
  }
  return branch;
}

function compactLocationParts(parts: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const compacted = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      const normalized = part.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  return compacted.join(", ") || null;
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
    url: publicAbsoluteUrl(`/g/${org.username}`),
    image: org.coverImageUrl ?? org.logoUrl ?? publicAbsoluteUrl(`/g/${org.username}/opengraph-image`),
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
