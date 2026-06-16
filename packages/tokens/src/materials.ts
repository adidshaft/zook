import { darkPalette, lightPalette, type Palette } from "./palette.ts";
import { shadows } from "./shadows.ts";

export type ThemeMode = "light" | "dark";

export type GlassBarMaterial = {
  blurIntensity: number;
  blurTint: ThemeMode;
  overlayColor: string;
  hairline: string;
};

export type TonalBarMaterial = {
  backgroundColor: string;
  elevation: number;
  topHairline: string;
};

export type CardSurfaceMaterial = {
  backgroundColor: string;
  borderColor: string;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  } | null;
  innerTopHighlight: string;
};

function materialPalette(mode: ThemeMode): Palette {
  return mode === "dark" ? darkPalette : lightPalette;
}

export function glassBarMaterial(mode: ThemeMode): GlassBarMaterial {
  return {
    blurIntensity: mode === "dark" ? 28 : 22,
    blurTint: mode,
    overlayColor: mode === "dark" ? "rgba(18,20,19,0.44)" : "rgba(255,255,255,0.54)",
    hairline: mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(17,21,15,0.08)",
  };
}

export function tonalBarMaterial(mode: ThemeMode): TonalBarMaterial {
  const palette = materialPalette(mode);
  return {
    backgroundColor: palette.bg.elevated,
    elevation: 3,
    topHairline: palette.border.subtle,
  };
}

export function cardSurfaceMaterial(mode: ThemeMode): CardSurfaceMaterial {
  const palette = materialPalette(mode);
  return {
    backgroundColor: palette.surface.default,
    borderColor: mode === "dark" ? "transparent" : palette.border.subtle,
    shadow: mode === "dark" ? null : shadows.card,
    innerTopHighlight: mode === "dark" ? "rgba(255,255,255,0.06)" : "transparent",
  };
}

export const materials = {
  glassBar: glassBarMaterial,
  tonalBar: tonalBarMaterial,
  cardSurface: cardSurfaceMaterial,
};
