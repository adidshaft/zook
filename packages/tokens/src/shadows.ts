import { darkPalette } from "./palette.ts";

export const shadows = {
  glowLime: {
    shadowColor: darkPalette.accent.strong,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  glowLimeSoft: {
    shadowColor: darkPalette.accent.strong,
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
    shadowColor: darkPalette.feedback.warning,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  glowRedSoft: {
    shadowColor: darkPalette.feedback.danger,
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
