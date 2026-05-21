import { contrast } from "./contrast";

type Palette = Record<string, string>;

export const palettes = {
  dark: {
    bg: "#070908",
    "bg-elevated": "#0f1411",
    "bg-sunken": "#050706",
    surface: "rgba(255, 255, 255, 0.04)",
    "surface-raised": "rgba(255, 255, 255, 0.07)",
    "surface-accent-soft": "rgba(185, 244, 85, 0.1)",
    "surface-danger-soft": "rgba(255, 90, 61, 0.12)",
    "surface-warning-soft": "rgba(242, 201, 76, 0.12)",
    "surface-success-soft": "rgba(125, 211, 172, 0.12)",
    "text-primary": "#f4f7ef",
    "text-secondary": "#c7cfc0",
    "text-tertiary": "#8b9586",
    "text-on-accent": "#11150f",
    "text-on-danger": "#11150f",
    "text-on-warning": "#11150f",
    "accent-fill": "#b9f455",
    "feedback-danger": "#ff5a3d",
    "feedback-warning": "#f2c94c",
  },
  light: {
    bg: "#f4f6f8",
    "bg-elevated": "#ffffff",
    "bg-sunken": "#ebeef1",
    surface: "#ffffff",
    "surface-raised": "#ffffff",
    "surface-accent-soft": "rgba(59, 122, 26, 0.07)",
    "surface-danger-soft": "rgba(239, 68, 68, 0.08)",
    "surface-warning-soft": "rgba(245, 158, 11, 0.08)",
    "surface-success-soft": "rgba(16, 185, 129, 0.08)",
    "text-primary": "#09090b",
    "text-secondary": "#27272a",
    "text-tertiary": "#3f3f46",
    "text-on-accent": "#09090b",
    "text-on-danger": "#ffffff",
    "text-on-warning": "#09090b",
    "accent-fill": "#a6e044",
    "feedback-danger": "#dc2626",
    "feedback-warning": "#f59e0b",
  },
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
