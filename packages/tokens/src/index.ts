export const zookColors = {
  bgApp: "#070908",
  bgElevated: "#0B0F0D",
  textPrimary: "#F4F7EF",
  textMuted: "#AEB8A8",
  textSubtle: "#778273",
  brandLime: "#B9F455",
  brandLimeSoft: "#D7FF6A",
  warning: "#F2C94C",
  danger: "#FF5A3D",
  blue: "#7DD3FC",
  violet: "#B9A9FF",
  glassFill: "rgba(255,255,255,0.06)",
  glassFillStrong: "rgba(255,255,255,0.08)",
  glassStroke: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.1)",
} as const;

export const zookSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const zookRadii = {
  chip: 999,
  pill: 999,
  input: 16,
  button: 18,
  smallCard: 18,
  card: 24,
  mainCard: 24,
  panel: 22,
  bottomNav: 28,
  large: 20,
  medium: 16,
  small: 12,
  icon: 18,
} as const;

export const zookTypography = {
  screenTitle: { fontSize: 26, lineHeight: 32, weight: 700 },
  headerTitle: { fontSize: 20, lineHeight: 26, weight: 600 },
  sectionTitle: { fontSize: 17, lineHeight: 22, weight: 600 },
  cardTitle: { fontSize: 15, lineHeight: 20, weight: 600 },
  body: { fontSize: 13.5, lineHeight: 19, weight: 400 },
  bodyStrong: { fontSize: 13.5, lineHeight: 19, weight: 600 },
  caption: { fontSize: 11.5, lineHeight: 15, weight: 600 },
  navLabel: { fontSize: 12, lineHeight: 15, weight: 600 },
  button: { fontSize: 13.5, lineHeight: 18, weight: 600 },
  eyebrow: { fontSize: 11, lineHeight: 14, weight: 600, letterSpacing: 0 },
} as const;

export const zookTokens = {
  colors: zookColors,
  radii: zookRadii,
  spacing: zookSpacing,
  typography: zookTypography,
} as const;
