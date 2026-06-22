import { darkPalette, lightPalette, type Palette as TokenPalette } from "@zook/tokens";

import { contrast } from "./contrast";

type Palette = Record<string, string>;

function flattenPalette(palette: TokenPalette): Palette {
  return {
    bg: palette.bg.app,
    "bg-elevated": palette.bg.elevated,
    "bg-sunken": palette.bg.sunken,
    surface: palette.surface.default,
    "surface-raised": palette.surface.raised,
    "surface-accent-soft": palette.surface.accentSoft,
    "surface-danger-soft": palette.surface.dangerSoft,
    "surface-warning-soft": palette.surface.warningSoft,
    "surface-success-soft": palette.surface.successSoft,
    "text-primary": palette.text.primary,
    "text-secondary": palette.text.secondary,
    "text-tertiary": palette.text.tertiary,
    "text-on-accent": palette.text.onAccent,
    "text-on-danger": palette.text.onDanger,
    "text-on-warning": palette.text.onWarning,
    "accent-fill": palette.accent.fill,
    "feedback-danger": palette.feedback.danger,
    "feedback-warning": palette.feedback.warning,
  };
}

export const palettes = {
  dark: flattenPalette(darkPalette),
  light: flattenPalette(lightPalette),
} satisfies Record<string, Palette>;

export const contrastPairs = [
  ["text-primary", "bg"],
  ["text-secondary", "bg"],
  ["text-tertiary", "bg"],
  ["text-primary", "bg-elevated"],
  ["text-secondary", "bg-elevated"],
  ["text-tertiary", "bg-elevated"],
  ["text-primary", "bg-sunken"],
  ["text-secondary", "bg-sunken"],
  ["text-tertiary", "bg-sunken"],
  ["text-primary", "surface"],
  ["text-secondary", "surface"],
  ["text-tertiary", "surface"],
  ["text-primary", "surface-raised"],
  ["text-secondary", "surface-raised"],
  ["text-tertiary", "surface-raised"],
  ["text-on-accent", "accent-fill"],
  ["text-on-danger", "feedback-danger"],
  ["text-on-warning", "feedback-warning"],
] as const;

export function auditPaletteContrast(palette: Palette) {
  return contrastPairs.map(([foregroundToken, backgroundToken]) => {
    const foreground = palette[foregroundToken];
    const background = palette[backgroundToken];
    if (!foreground || !background) {
      throw new Error(`Missing contrast token pair: ${foregroundToken} on ${backgroundToken}`);
    }
    return {
      foregroundToken,
      backgroundToken,
      ratio: contrast(foreground, background, palette.bg ?? background),
    };
  });
}
