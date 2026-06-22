import { darkPalette } from "./palette.ts";
import { layout } from "./layout.ts";
import { opacity } from "./opacity.ts";
import { radii } from "./radii.ts";
import { shadows, shadowIntensity } from "./shadows.ts";
import { spacing } from "./spacing.ts";
import { typography } from "./typography.ts";

const lime = (value: number) => `rgba(185,244,85,${value})`;
const amber = (value: number) => `rgba(242,201,76,${value})`;
const red = (value: number) => `rgba(255,90,61,${value})`;

export const zookColors = {
  bgApp: darkPalette.bg.app,
  bgElevated: darkPalette.bg.elevated,
  textPrimary: darkPalette.text.primary,
  textMuted: darkPalette.text.secondary,
  textSubtle: darkPalette.text.tertiary,
  brandLime: darkPalette.accent.base,
  brandLimeSoft: darkPalette.accent.soft,
  warning: darkPalette.feedback.warning,
  danger: darkPalette.feedback.danger,
  blue: darkPalette.feedback.info,
  violet: "#B9A9FF",
  glassFill: darkPalette.surface.default,
  glassFillStrong: darkPalette.surface.raised,
  glassStroke: darkPalette.border.default,
  divider: darkPalette.border.subtle,
  overlayDark: darkPalette.bg.overlay,
  bg: darkPalette.bg.app,
  surfaceSolid: darkPalette.bg.elevated,
  surfaceRaised: darkPalette.surface.raised,
  surface: darkPalette.surface.default,
  panel: darkPalette.surface.default,
  panelStrong: darkPalette.surface.raised,
  accentPanel: darkPalette.surface.accentSoft,
  border: darkPalette.border.default,
  borderStrong: darkPalette.border.strong,
  limeBorder: darkPalette.accent.strong,
  text: darkPalette.text.primary,
  muted: darkPalette.text.secondary,
  subtle: darkPalette.text.tertiary,
  paper: darkPalette.bg.elevated,
  ink: darkPalette.text.primary,
  inkSoft: darkPalette.text.tertiary,
  lime: darkPalette.accent.base,
  limeSoft: darkPalette.accent.soft,
  amber: darkPalette.feedback.warning,
  red: darkPalette.feedback.danger,
} as const;

export const legacyColors = zookColors;
export const zookSpacing = spacing;
export const zookRadii = radii;
export const zookTypography = typography;

export const palettes = {
  glass: {
    fill: zookColors.glassFill,
    fillStrong: zookColors.glassFillStrong,
    stroke: zookColors.glassStroke,
    divider: zookColors.divider,
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
  colors: zookColors,
  color: zookColors,
  bg: {
    base: zookColors.bgApp,
    elevated: zookColors.bgElevated,
    surface: zookColors.glassFill,
    surfaceStrong: zookColors.glassFillStrong,
  },
  text: {
    primary: zookColors.textPrimary,
    muted: zookColors.textMuted,
    subtle: zookColors.textSubtle,
  },
  accent: {
    lime: zookColors.brandLime,
    limeSoft: zookColors.brandLimeSoft,
    limeDim: zookColors.accentPanel,
    limeBorder: zookColors.limeBorder,
  },
  status: {
    success: zookColors.brandLime,
    warning: zookColors.warning,
    danger: zookColors.danger,
  },
  opacity,
  border: {
    glass: zookColors.glassStroke,
    subtle: zookColors.divider,
    glassStrong: zookColors.borderStrong,
  },
  radius: radii,
  radii,
  spacing,
  typography,
  layout,
  shadow: shadows,
  shadowIntensity,
  palette: palettes,
} as const;
