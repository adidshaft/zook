import {
  darkPalette,
  elevation,
  layout,
  lightPalette,
  materials,
  opacity,
  radii,
  shadowIntensity,
  shadows,
  spacing,
  typography,
} from "@zook/tokens";

export {
  darkPalette,
  elevation,
  lightPalette,
  layout,
  materials,
  opacity,
  radii,
  shadowIntensity,
  shadows,
  spacing,
  typography,
};

export const palettes = {
  light: lightPalette,
  dark: darkPalette,
} as const;

export const zookTokens = {
  palettes,
  spacing,
  radii,
  typography,
  layout,
  opacity,
  shadows,
  shadowIntensity,
  materials,
} as const;
