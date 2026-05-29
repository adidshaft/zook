const lime = (opacity: number) => `rgba(166,224,68,${opacity})`;
const amber = (opacity: number) => `rgba(217,119,6,${opacity})`;
const red = (opacity: number) => `rgba(220,38,38,${opacity})`;

const colors = {
  bgApp: "#F7F8F4",
  bgElevated: "#FFFFFF",
  textPrimary: "#11150F",
  textMuted: "#3F463C",
  textSubtle: "#6F7769",
  brandLime: "#A6E044",
  brandLimeSoft: "#C7F472",
  warning: "#D97706",
  danger: "#DC2626",
  glassFill: "#FFFFFF",
  glassFillStrong: "#FFFFFF",
  glassStroke: "rgba(17,21,15,0.14)",
  divider: "rgba(17,21,15,0.08)",
  overlayDark: "rgba(17,21,15,0.45)",
  bg: "#F7F8F4",
  surfaceSolid: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surface: "#FFFFFF",
  panel: "#FFFFFF",
  panelStrong: "#FFFFFF",
  accentPanel: "rgba(166,224,68,0.16)",
  border: "rgba(17,21,15,0.14)",
  borderStrong: "rgba(17,21,15,0.22)",
  limeBorder: "#7CB427",
  text: "#11150F",
  muted: "#3F463C",
  subtle: "#6F7769",
  paper: "#F2F5EB",
  ink: "#11150F",
  inkSoft: "#6F7769",
  lime: "#A6E044",
  limeSoft: "#C7F472",
  amber: "#D97706",
  red: "#DC2626",
  blue: "#0284C7",
  violet: "#B9A9FF",
};

export const legacyColors = colors;

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
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  caption: { fontSize: 12.5, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  small: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  metric: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  navLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  button: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },

  display: { fontSize: 34, fontFamily: "Inter_700Bold", lineHeight: 39 },
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
  bottomNavContentPadding: 120,
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
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 1,
  },
  glass: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
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
    shadowOpacity: 0.08,
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
