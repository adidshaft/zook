import type { Ionicons } from "@expo/vector-icons";

type IonIconName = keyof typeof Ionicons.glyphMap;

export type AmenityCatalogItem = {
  key: string;
  label: string;
  icon: IonIconName;
  /** Lowercase substrings that, if present in a gym's amenities/equipment, mark this as available. */
  match: string[];
};

/**
 * Curated set of the amenities members care about, each with an icon so a gym
 * profile can show — at a glance — what a gym HAS and what it DOESN'T. Gym
 * amenity data is freeform, so we match case-insensitively against these terms.
 */
export const AMENITY_CATALOG: AmenityCatalogItem[] = [
  { key: "strength", label: "Strength area", icon: "barbell-outline", match: ["strength", "weights", "free weights", "power rack", "dumbbell"] },
  { key: "cardio", label: "Cardio zone", icon: "heart-outline", match: ["cardio", "treadmill", "elliptical", "bike", "rowing"] },
  { key: "trainers", label: "Personal training", icon: "fitness-outline", match: ["personal training", "certified trainers", "trainers", "coaching"] },
  { key: "classes", label: "Group classes", icon: "people-outline", match: ["group classes", "classes", "yoga", "zumba", "hiit"] },
  { key: "locker", label: "Lockers", icon: "lock-closed-outline", match: ["locker", "lockers", "locker room"] },
  { key: "showers", label: "Showers", icon: "water-outline", match: ["shower", "showers"] },
  { key: "ac", label: "Air conditioned", icon: "snow-outline", match: ["air conditioning", "air conditioned", "climate control"] },
  { key: "parking", label: "Parking", icon: "car-outline", match: ["parking", "valet"] },
  { key: "shop", label: "Nutrition bar", icon: "nutrition-outline", match: ["protein bar", "nutrition bar", "nutrition", "cafe", "shop", "supplements"] },
  { key: "diet", label: "Diet plans", icon: "restaurant-outline", match: ["diet plans", "diet", "meal plan"] },
  { key: "qr", label: "QR entry", icon: "qr-code-outline", match: ["qr entry", "qr"] },
  { key: "upi", label: "UPI payments", icon: "card-outline", match: ["upi", "upi payments", "online payments"] },
];

/**
 * Splits the catalog into what the gym offers vs not, by matching the gym's
 * freeform amenity + equipment strings against each catalog item's terms.
 */
export function resolveAmenities(sources: Array<string | null | undefined>): {
  available: AmenityCatalogItem[];
  missing: AmenityCatalogItem[];
} {
  const haystack = sources
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  // Whole-word token set, so short terms (e.g. "qr", "upi") don't substring-
  // match unrelated words like "machine" or "racks".
  const tokens = new Set(haystack.flatMap((value) => value.split(/[^a-z0-9]+/).filter(Boolean)));
  const termMatches = (term: string) =>
    term.length <= 3
      ? tokens.has(term)
      : haystack.some((value) => value.includes(term));
  const available: AmenityCatalogItem[] = [];
  const missing: AmenityCatalogItem[] = [];
  for (const item of AMENITY_CATALOG) {
    const has = item.match.some(termMatches);
    (has ? available : missing).push(item);
  }
  return { available, missing };
}
