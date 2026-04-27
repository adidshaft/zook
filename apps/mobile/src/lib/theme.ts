export const colors = {
  bg: "#070908",
  surfaceSolid: "#10140f",
  surfaceRaised: "#171d14",
  surface: "rgba(255,255,255,0.05)",
  panel: "rgba(255,255,255,0.05)",
  panelStrong: "rgba(255,255,255,0.08)",
  accentPanel: "rgba(185,244,85,0.14)",
  border: "rgba(255,255,255,0.14)",
  borderStrong: "rgba(255,255,255,0.18)",
  limeBorder: "rgba(185,244,85,0.45)",
  text: "#f4f7ef",
  muted: "#aeb8a8",
  subtle: "#778273",
  paper: "#f2f5eb",
  ink: "#11150f",
  inkSoft: "#6f7769",
  lime: "#b9f455",
  limeSoft: "#d7ff8a",
  amber: "#f2c94c",
  red: "#ff5a3d",
  blue: "#7dd3fc",
  violet: "#b9a9ff"
};

export const radii = {
  card: 28,
  panel: 24,
  large: 20,
  medium: 16,
  small: 12,
  input: 20,
  icon: 18,
  pill: 999
};

export const typography = {
  display: { fontSize: 42, fontFamily: "Inter_700Bold", lineHeight: 48 },
  h1: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 36 },
  h2: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  h3: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 24 },
  headline: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 36 },
  title: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  titleSmall: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 24 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  small: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  caption: { fontSize: 11, fontFamily: "Inter_600SemiBold", lineHeight: 14 },
  metric: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0, textTransform: "uppercase" as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const layout = {
  mobileWidth: 390,
  mobileHeight: 844,
  screenPadding: 20,
  contentWidth: 350,
  bottomNavHeight: 72,
};

export const shadows = {
  glowLime: {
    shadowColor: colors.lime,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  glass: {
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 2,
  },
};

export const zookTokens = {
  bg: {
    base: colors.bg,
    surface: colors.surface,
    surfaceStrong: colors.panelStrong,
  },
  text: {
    primary: colors.text,
    muted: colors.muted,
  },
  accent: {
    lime: colors.lime,
    limeDim: colors.accentPanel,
    limeBorder: colors.limeBorder,
  },
  status: {
    success: colors.lime,
    warning: colors.amber,
    danger: colors.red,
  },
  opacity: {
    glassLow: 0.05,
    glassHigh: 0.08,
    glassStroke: 0.14,
    subtleStroke: 0.1,
    dim: 0.56,
  },
  border: {
    glass: colors.border,
    glassStrong: colors.borderStrong,
  },
  radius: radii,
  spacing,
  layout,
  shadow: shadows,
} as const;
