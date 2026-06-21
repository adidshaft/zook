export type AmenityCatalogItem = {
  key: string;
  label: string;
  match: string[];
};

export const AMENITY_CATALOG: AmenityCatalogItem[] = [
  { key: "strength", label: "Strength area", match: ["strength", "weights", "free weights", "power rack", "dumbbell"] },
  { key: "cardio", label: "Cardio zone", match: ["cardio", "treadmill", "elliptical", "bike", "rowing"] },
  { key: "trainers", label: "Personal training", match: ["personal training", "certified trainers", "trainers", "coaching"] },
  { key: "classes", label: "Group classes", match: ["group classes", "classes", "yoga", "zumba", "hiit"] },
  { key: "locker", label: "Lockers", match: ["locker", "lockers", "locker room"] },
  { key: "showers", label: "Showers", match: ["shower", "showers"] },
  { key: "ac", label: "Air conditioned", match: ["air conditioning", "air conditioned", "climate control"] },
  { key: "parking", label: "Parking", match: ["parking", "valet"] },
  { key: "shop", label: "Nutrition bar", match: ["protein bar", "nutrition bar", "nutrition", "cafe", "shop", "supplements"] },
  { key: "diet", label: "Diet plans", match: ["diet plans", "diet", "meal plan"] },
  { key: "qr", label: "QR entry", match: ["qr entry", "qr"] },
  { key: "upi", label: "UPI payments", match: ["upi", "upi payments", "online payments"] },
];

export function resolveAmenities(sources: Array<string | null | undefined>): {
  available: AmenityCatalogItem[];
  missing: AmenityCatalogItem[];
} {
  const haystack = sources
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  const tokens = new Set(haystack.flatMap((value) => value.split(/[^a-z0-9]+/).filter(Boolean)));
  const termMatches = (term: string) =>
    term.length <= 3 ? tokens.has(term) : haystack.some((value) => value.includes(term));
  const available: AmenityCatalogItem[] = [];
  const missing: AmenityCatalogItem[] = [];
  for (const item of AMENITY_CATALOG) {
    (item.match.some(termMatches) ? available : missing).push(item);
  }
  return { available, missing };
}
