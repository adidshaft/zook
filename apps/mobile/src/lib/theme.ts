const glass = (opacity: number) => `rgba(255,255,255,${opacity})`;
const lime = (opacity: number) => `rgba(185,244,85,${opacity})`;
const amber = (opacity: number) => `rgba(242,201,76,${opacity})`;
const red = (opacity: number) => `rgba(255,90,61,${opacity})`;

export const colors = {
  bgApp: "#070908",
  bgElevated: "#0C100E",
  textPrimary: "#F4F7EF",
  textMuted: "#AEB8A8",
  textSubtle: "#778273",
  brandLime: "#B9F455",
  brandLimeSoft: "#D7FF6A",
  warning: "#F2C94C",
  danger: "#FF5A3D",
  glassFill: glass(0.06),
  glassFillStrong: glass(0.08),
  glassStroke: glass(0.14),
  divider: glass(0.1),
  overlayDark: "rgba(0,0,0,0.45)",

  // Compatibility aliases used by existing screens.
  bg: "#070908",
  surfaceSolid: "#0C100E",
  surfaceRaised: "#10150F",
  surface: glass(0.06),
  panel: glass(0.06),
  panelStrong: glass(0.08),
  accentPanel: lime(0.1),
  border: glass(0.14),
  borderStrong: glass(0.18),
  limeBorder: lime(0.32),
  text: "#F4F7EF",
  muted: "#AEB8A8",
  subtle: "#778273",
  paper: "#F2F5EB",
  ink: "#11150F",
  inkSoft: "#6F7769",
  lime: "#B9F455",
  limeSoft: "#D7FF6A",
  amber: "#F2C94C",
  red: "#FF5A3D",
  blue: "#7DD3FC",
  violet: "#B9A9FF",
};

export const opacity = {
  glassLow: 0.05,
  glassDefault: 0.06,
  glassHigh: 0.08,
  glassStroke: 0.14,
  subtleStroke: 0.1,
  dim: 0.56,
  glowAmbient: 0.14,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const radii = {
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
};

export const typography = {
  screenTitle: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  body: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 19 },
  bodyStrong: { fontSize: 13.5, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  caption: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  small: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  metric: { fontSize: 26, fontFamily: "Inter_600SemiBold", lineHeight: 31 },
  navLabel: { fontSize: 10.5, fontFamily: "Inter_600SemiBold", lineHeight: 13 },
  button: { fontSize: 13.5, fontFamily: "Inter_600SemiBold", lineHeight: 18 },

  // Compatibility aliases used by existing screens.
  display: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 38 },
  h1: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  h2: { fontSize: 20, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  h3: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  headline: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  title: { fontSize: 20, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  titleSmall: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
    textTransform: "uppercase" as const,
  },
};

export const layout = {
  mobileWidth: 390,
  mobileHeight: 844,
  screenPadding: 20,
  contentWidth: 370,
  topSectionGap: 24,
  cardGap: 12,
  cardPadding: 18,
  formFieldGap: 12,
  sectionGap: 24,
  bottomNavHeight: 72,
  bottomNavHorizontalMargin: 18,
  stickyActionHeight: 92,
};

export const shadows = {
  glowLime: {
    shadowColor: colors.lime,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  glowLimeSoft: {
    shadowColor: colors.lime,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  glass: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 1,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 1,
  },
};

export const palettes = {
  glass: {
    fill: colors.glassFill,
    fillStrong: colors.glassFillStrong,
    stroke: colors.glassStroke,
    divider: colors.divider,
  },
  lime: {
    fill: lime(0.11),
    fillSoft: lime(0.08),
    stroke: lime(0.3),
    strokeStrong: lime(0.42),
    glow: lime(0.16),
  },
  warning: {
    fill: amber(0.12),
    stroke: amber(0.34),
    glow: amber(0.16),
  },
  danger: {
    fill: red(0.12),
    stroke: red(0.34),
    glow: red(0.16),
  },
};

export const zookTokens = {
  color: colors,
  bg: {
    base: colors.bgApp,
    elevated: colors.bgElevated,
    surface: colors.glassFill,
    surfaceStrong: colors.glassFillStrong,
  },
  text: {
    primary: colors.textPrimary,
    muted: colors.textMuted,
    subtle: colors.textSubtle,
  },
  accent: {
    lime: colors.brandLime,
    limeSoft: colors.brandLimeSoft,
    limeDim: colors.accentPanel,
    limeBorder: colors.limeBorder,
  },
  status: {
    success: colors.brandLime,
    warning: colors.warning,
    danger: colors.danger,
  },
  opacity,
  border: {
    glass: colors.glassStroke,
    subtle: colors.divider,
    glassStrong: colors.borderStrong,
  },
  radius: radii,
  spacing,
  typography,
  layout,
  shadow: shadows,
  palette: palettes,
} as const;
