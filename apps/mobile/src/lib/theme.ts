const glass = (opacity: number) => `rgba(255,255,255,${opacity})`;
const lime = (opacity: number) => `rgba(185,244,85,${opacity})`;
const amber = (opacity: number) => `rgba(242,201,76,${opacity})`;
const red = (opacity: number) => `rgba(255,90,61,${opacity})`;
const bgApp = "#070908";
const bgElevated = "#0B0F0D";
const textPrimary = "#F4F7EF";
const textMuted = "#AEB8A8";
const textSubtle = "#778273";
const brandLime = "#B9F455";
const brandLimeSoft = "#D7FF6A";
const warning = "#F2C94C";
const danger = "#FF5A3D";

export const colors = {
  bgApp,
  bgElevated,
  textPrimary,
  textMuted,
  textSubtle,
  brandLime,
  brandLimeSoft,
  warning,
  danger,
  glassFill: glass(0.06),
  glassFillStrong: glass(0.08),
  glassStroke: glass(0.14),
  divider: glass(0.1),
  overlayDark: "rgba(0,0,0,0.45)",

  // Compatibility aliases used by existing screens.
  /** @deprecated Prefer bgApp. */
  bg: bgApp,
  /** @deprecated Prefer bgElevated/glassFill. */
  surfaceSolid: "#0C100E",
  surfaceRaised: "#111610",
  surface: glass(0.06),
  panel: glass(0.06),
  panelStrong: glass(0.08),
  accentPanel: lime(0.1),
  border: glass(0.14),
  borderStrong: glass(0.2),
  limeBorder: lime(0.32),
  /** @deprecated Prefer textPrimary. */
  text: textPrimary,
  /** @deprecated Prefer textMuted. */
  muted: textMuted,
  /** @deprecated Prefer textSubtle. */
  subtle: textSubtle,
  paper: "#F2F5EB",
  ink: "#11150F",
  inkSoft: "#6F7769",
  /** @deprecated Prefer brandLime. */
  lime: brandLime,
  limeSoft: brandLimeSoft,
  amber: warning,
  red: danger,
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
  button: 999,
  smallCard: 18,
  card: 28,
  mainCard: 28,
  panel: 32,
  bottomNav: 28,
  large: 20,
  medium: 16,
  small: 12,
  icon: 18,
};

export const typography = {
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 32 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  body: { fontSize: 13.5, fontFamily: "Inter_400Regular", lineHeight: 19 },
  bodyStrong: { fontSize: 13.5, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  caption: { fontSize: 11.5, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  small: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  metric: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  navLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  button: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },

  // Compatibility aliases used by existing screens.
  /** @deprecated Prefer screenTitle. */
  display: { fontSize: 34, fontFamily: "Inter_700Bold", lineHeight: 39 },
  /** @deprecated Prefer screenTitle/headerTitle. */
  h1: { fontSize: 24, fontFamily: "Inter_600SemiBold", lineHeight: 30 },
  /** @deprecated Prefer headerTitle. */
  h2: { fontSize: 20, fontFamily: "Inter_600SemiBold", lineHeight: 26 },
  /** @deprecated Prefer cardTitle. */
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
  bottomNavContentPadding: 176,
  bottomNavHorizontalMargin: 18,
  stickyActionHeight: 108,
  demoStripHeight: 28,
};

export const shadows = {
  glowLime: {
    shadowColor: colors.lime,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  glowLimeSoft: {
    shadowColor: colors.lime,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  glowDark: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 1,
  },
  glass: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 1,
  },
  glowAmberSoft: {
    shadowColor: colors.amber,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  glowRedSoft: {
    shadowColor: colors.red,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 1,
  },
};

export const shadowIntensity = {
  subtle: 0.06,
  normal: 0.12,
  strong: 0.18,
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
  shadowIntensity,
  palette: palettes,
} as const;
