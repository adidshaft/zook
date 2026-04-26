export const colors = {
  bg: "#070908",
  surface: "rgba(255,255,255,0.05)",
  panel: "rgba(255,255,255,0.06)",
  panelStrong: "rgba(255,255,255,0.08)",
  accentPanel: "rgba(185,244,85,0.16)",
  border: "rgba(255,255,255,0.12)",
  borderStrong: "rgba(255,255,255,0.18)",
  limeBorder: "rgba(185,244,85,0.45)",
  text: "#f4f7ef",
  muted: "#aeb8a8",
  paper: "#f2f5eb",
  ink: "#11150f",
  inkSoft: "#6f7769",
  lime: "#b9f455",
  amber: "#f5c84b",
  red: "#ff6b5f",
  blue: "#7dd3fc",
  violet: "#b9a9ff"
};

export const radii = {
  card: 28,
  panel: 24,
  input: 20,
  icon: 18,
  pill: 999
};

export const typography = {
  display: { fontSize: 36, fontFamily: "Inter_900Black", lineHeight: 40 },
  headline: { fontSize: 28, fontFamily: "Inter_900Black", lineHeight: 32 },
  title: { fontSize: 22, fontFamily: "Inter_900Black", lineHeight: 26 },
  titleSmall: { fontSize: 18, fontFamily: "Inter_800ExtraBold", lineHeight: 22 },
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  caption: { fontSize: 13, fontFamily: "Inter_700Bold", lineHeight: 18 },
  eyebrow: { fontSize: 12, fontFamily: "Inter_800ExtraBold", letterSpacing: 0, textTransform: "uppercase" as const },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
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
  border: {
    glass: colors.border,
    glassStrong: colors.borderStrong,
  },
  radius: radii,
  spacing,
  shadow: shadows,
} as const;
