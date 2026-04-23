export const zookColors = {
  graphite950: "#070908",
  graphite900: "#101310",
  graphite800: "#171c18",
  graphite700: "#222820",
  graphite600: "#333b32",
  glass: "rgba(255, 255, 255, 0.08)",
  glassStrong: "rgba(255, 255, 255, 0.14)",
  border: "rgba(255, 255, 255, 0.14)",
  text: "#f4f7ef",
  textMuted: "#aeb8a8",
  lime: "#b9f455",
  limeDeep: "#6fad21",
  amber: "#ffb650",
  red: "#ff5d5d",
  blue: "#7dd3fc"
} as const;

export const zookRadii = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999
} as const;

export const zookSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
} as const;

export const zookTypography = {
  family:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  display: {
    fontSize: 48,
    lineHeight: 1.04,
    fontWeight: "760"
  },
  h1: {
    fontSize: 34,
    lineHeight: 1.08,
    fontWeight: "740"
  },
  h2: {
    fontSize: 24,
    lineHeight: 1.18,
    fontWeight: "700"
  },
  body: {
    fontSize: 15,
    lineHeight: 1.55,
    fontWeight: "450"
  },
  metric: {
    fontSize: 38,
    lineHeight: 1,
    fontWeight: "780",
    fontVariantNumeric: "tabular-nums"
  }
} as const;

export const zookShadows = {
  glass: "0 20px 70px rgba(0, 0, 0, 0.36)",
  inset: "inset 0 1px 0 rgba(255, 255, 255, 0.12)"
} as const;

export const zookTokens = {
  colors: zookColors,
  radii: zookRadii,
  spacing: zookSpacing,
  typography: zookTypography,
  shadows: zookShadows
} as const;
