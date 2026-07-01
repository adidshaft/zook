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

const SEEDED_LOGOS: Record<string, string> = {
  "/seed/gyms/aarogya-strength/logo.svg": [
    '<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">',
    '<rect width="256" height="256" rx="64" fill="#0B1208"/>',
    '<rect x="18" y="18" width="220" height="220" rx="50" stroke="#B6F542" stroke-width="10"/>',
    '<path d="M73 164L108 86H130L165 164H141L135 149H103L97 164H73ZM109.5 131H128.5L119 106L109.5 131Z" fill="#B6F542"/>',
    '<path d="M128 61C143 48 162 45 183 52C178 70 166 83 147 91C139 78 133 68 128 61Z" fill="#B6F542" opacity="0.72"/>',
    '<path d="M128 61C113 48 94 45 73 52C78 70 90 83 109 91C117 78 123 68 128 61Z" fill="#B6F542" opacity="0.72"/>',
    '<path d="M70 190H186" stroke="#B6F542" stroke-width="12" stroke-linecap="round"/>',
    '<path d="M91 204H165" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7"/>',
    "</svg>",
  ].join(""),
  "/seed/gyms/your-fitness/logo.svg": [
    '<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">',
    '<rect width="256" height="256" rx="64" fill="#071112"/>',
    '<rect x="18" y="18" width="220" height="220" rx="50" stroke="#4FD1C5" stroke-width="10"/>',
    '<path d="M63 70H91L120 121L149 70H177L133 145V186H107V145L63 70Z" fill="#4FD1C5"/>',
    '<path d="M81 190H175" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.72"/>',
    '<path d="M74 212H182" stroke="#4FD1C5" stroke-width="10" stroke-linecap="round"/>',
    "</svg>",
  ].join(""),
};

export function seededGymLogoDataUri(logoUrl?: string | null) {
  const trimmed = logoUrl?.trim();
  if (!trimmed) return undefined;
  const matchedPath = Object.keys(SEEDED_LOGOS).find((path) => trimmed.endsWith(path));
  const svg = matchedPath ? SEEDED_LOGOS[matchedPath] : undefined;
  return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : undefined;
}

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
