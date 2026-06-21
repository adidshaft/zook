/**
 * Per-gym branding helpers.
 *
 * Most gyms don't upload a logo, so a flat accent-coloured initial makes every
 * gym look identical in the app. Derive a stable brand hue from the gym name so
 * each gym gets a distinct, consistent monogram across sessions and surfaces.
 * When a real logo is available it should be preferred over the monogram.
 */

// Vivid hues that all read well on the dark-first surfaces.
const GYM_BRAND_COLORS = [
  "#B9F455", // lime
  "#4FD1C5", // teal
  "#A78BFA", // violet
  "#FBBF24", // amber
  "#FB7185", // rose
  "#60A5FA", // blue
  "#34D399", // emerald
  "#FB923C", // orange
  "#22D3EE", // cyan
  "#F472B6", // pink
];

export type GymBrand = {
  /** Vivid colour for the monogram text / accents. */
  solid: string;
  /** Translucent fill for the monogram background. */
  soft: string;
  /** Upper-cased single-letter monogram. */
  initial: string;
};

export function gymBrandColor(seed?: string | null): GymBrand {
  const key = (seed ?? "").trim() || "Zook";
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  const solid = GYM_BRAND_COLORS[hash % GYM_BRAND_COLORS.length] ?? GYM_BRAND_COLORS[0]!;
  return {
    solid,
    soft: `${solid}2E`, // ~18% alpha
    initial: key.charAt(0).toUpperCase() || "Z",
  };
}
