import { lightPalette } from "./palettes/light";

const defaultPalette = lightPalette;

export const colors = {
  bgApp: defaultPalette.bg.app,
  bgElevated: defaultPalette.bg.elevated,
  textPrimary: defaultPalette.text.primary,
  textMuted: defaultPalette.text.secondary,
  textSubtle: defaultPalette.text.tertiary,
  brandLime: defaultPalette.accent.base,
  brandLimeSoft: defaultPalette.accent.soft,
  warning: defaultPalette.feedback.warning,
  danger: defaultPalette.feedback.danger,
  glassFill: defaultPalette.surface.default,
  glassFillStrong: defaultPalette.surface.raised,
  glassStroke: defaultPalette.border.default,
  divider: defaultPalette.border.subtle,
  overlayDark: defaultPalette.bg.overlay,

  /** @deprecated Prefer bgApp. */
  bg: defaultPalette.bg.app,
  /** @deprecated Prefer bgElevated/glassFill. */
  surfaceSolid: defaultPalette.bg.elevated,
  surfaceRaised: defaultPalette.surface.raised,
  surface: defaultPalette.surface.default,
  panel: defaultPalette.surface.default,
  panelStrong: defaultPalette.surface.raised,
  accentPanel: defaultPalette.surface.accentSoft,
  border: defaultPalette.border.default,
  borderStrong: defaultPalette.border.strong,
  limeBorder: defaultPalette.accent.strong,
  /** @deprecated Prefer textPrimary. */
  text: defaultPalette.text.primary,
  /** @deprecated Prefer textMuted. */
  muted: defaultPalette.text.secondary,
  /** @deprecated Prefer textSubtle. */
  subtle: defaultPalette.text.tertiary,
  paper: "#F2F5EB",
  ink: "#11150F",
  inkSoft: "#6F7769",
  /** @deprecated Prefer brandLime. */
  lime: defaultPalette.accent.base,
  limeSoft: defaultPalette.accent.soft,
  amber: defaultPalette.feedback.warning,
  red: defaultPalette.feedback.danger,
  blue: defaultPalette.feedback.info,
  violet: "#B9A9FF",
};

export {
  layout,
  opacity,
  palettes,
  radii,
  shadowIntensity,
  shadows,
  spacing,
  typography,
  zookTokens,
} from "./tokens-static";
