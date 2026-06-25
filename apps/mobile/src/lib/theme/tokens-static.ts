import {
  darkPalette,
  elevation,
  layout,
  lightPalette,
  materials,
  opacity,
  radii,
  shadowIntensity,
  shadows,
  spacing,
  typography as baseTypography,
} from "@zook/tokens";

export {
  darkPalette,
  elevation,
  lightPalette,
  layout,
  materials,
  opacity,
  radii,
  shadowIntensity,
  shadows,
  spacing,
};

/*
 * Mobile typography voice. Headlines, titles and numerals use Sora (a geometric
 * display face) for a confident, athletic identity; body, labels and small text
 * stay on Inter for legibility. This override is mobile-only — web keeps the
 * shared token CSS — and every screen that reads `typography` from "@/lib/theme"
 * inherits the upgrade automatically.
 */
export const typography = {
  ...baseTypography,
  display: {
    fontFamily: "Sora_800ExtraBold",
    fontSize: 38,
    letterSpacing: -1.1,
    lineHeight: 42,
  },
  heroTitle: {
    fontFamily: "Sora_800ExtraBold",
    fontSize: 32,
    letterSpacing: -0.9,
    lineHeight: 37,
  },
  screenTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 27,
    letterSpacing: -0.7,
    lineHeight: 33,
  },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 20,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
    lineHeight: 23,
  },
  cardTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  metric: {
    fontFamily: "Sora_700Bold",
    fontSize: 28,
    fontVariant: ["tabular-nums" as const],
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  timer: {
    fontFamily: "Sora_800ExtraBold",
    fontSize: 46,
    fontVariant: ["tabular-nums" as const],
    letterSpacing: -1,
    lineHeight: 50,
  },
};

/*
 * Gradient + glow tokens (dark-first). Used with expo-linear-gradient to give
 * hero cards, primary CTAs and the ambient screen backdrop real depth instead
 * of flat fills. `as const` keeps the color tuples typed for LinearGradient.
 */
export const gradients = {
  // Primary lime CTA — bright top-left to deeper bottom-right.
  accentButton: ["#D2FB66", "#A9EA3C"] as const,
  // Ambient lime glow behind headers / hero content.
  accentGlow: ["rgba(185,244,85,0.20)", "rgba(185,244,85,0.0)"] as const,
  // Featured hero card surface (workout / today).
  heroCard: ["#1A2410", "#0C0F08"] as const,
  heroCardAccent: ["rgba(185,244,85,0.16)", "rgba(185,244,85,0.02)"] as const,
  // Neutral raised card sheen — subtle top highlight.
  cardSheen: ["rgba(255,255,255,0.07)", "rgba(255,255,255,0.015)"] as const,
  // Screen backdrop is always-dark; do not render palette.text.* over it unless
  // the consuming component branches on theme mode.
  screenBackdrop: ["#0B0D0A", "#000000"] as const,
  // Class-type tints (paired with the lime accent system).
  classRed: ["rgba(255,90,61,0.18)", "rgba(255,90,61,0.02)"] as const,
  classBlue: ["rgba(125,211,252,0.18)", "rgba(125,211,252,0.02)"] as const,
  classViolet: ["rgba(177,148,255,0.18)", "rgba(177,148,255,0.02)"] as const,
  classAmber: ["rgba(242,201,76,0.18)", "rgba(242,201,76,0.02)"] as const,
};

export const gradientsLight = {
  accentButton: ["#A9EA3C", "#82D116"] as const,
  accentGlow: ["rgba(34,197,94,0.14)", "rgba(34,197,94,0.0)"] as const,
  heroCard: ["#F0FBE8", "#FFFFFF"] as const,
  heroCardAccent: ["rgba(22,163,74,0.10)", "rgba(22,163,74,0.01)"] as const,
  cardSheen: ["rgba(0,0,0,0.04)", "rgba(0,0,0,0.01)"] as const,
  screenBackdrop: ["#F7F9F5", "#FFFFFF"] as const,
  classRed: ["rgba(220,38,38,0.12)", "rgba(220,38,38,0.01)"] as const,
  classBlue: ["rgba(2,132,199,0.12)", "rgba(2,132,199,0.01)"] as const,
  classViolet: ["rgba(109,40,217,0.12)", "rgba(109,40,217,0.01)"] as const,
  classAmber: ["rgba(217,119,6,0.12)", "rgba(217,119,6,0.01)"] as const,
};

export const glow = {
  // Lime CTA bloom.
  accent: {
    shadowColor: "#B9F455",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  // Soft neutral lift for floating cards.
  soft: {
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export const palettes = {
  light: lightPalette,
  dark: darkPalette,
} as const;

export const zookTokens = {
  palettes,
  spacing,
  radii,
  typography,
  layout,
  opacity,
  shadows,
  shadowIntensity,
  materials,
  gradients,
  glow,
} as const;
