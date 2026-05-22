import type { Palette } from "../tokens";

export const darkPalette: Palette = {
  bg: {
    app: "#000000",
    elevated: "#121413",
    sunken: "#070807",
    overlay: "rgba(0,0,0,0.65)",
  },
  surface: {
    default: "rgba(255,255,255,0.06)",
    raised: "rgba(255,255,255,0.10)",
    accentSoft: "rgba(185,244,85,0.12)",
    dangerSoft: "rgba(255,90,61,0.15)",
    warningSoft: "rgba(242,201,76,0.15)",
    successSoft: "rgba(125,211,172,0.15)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#D4DDD0",
    // AA on bg.app and readable on raised surfaces; reserve tertiary for metadata only.
    tertiary: "#99A595",
    inverse: "#000000",
    onAccent: "#000000",
    onDanger: "#FFFFFF",
    onWarning: "#000000",
  },
  border: {
    subtle: "rgba(255,255,255,0.11)",
    default: "rgba(255,255,255,0.18)",
    strong: "rgba(255,255,255,0.28)",
    focus: "#B9F455",
  },
  accent: {
    base: "#B9F455",
    soft: "#D7FF6A",
    strong: "#A6E044",
    fill: "#B9F455",
  },
  feedback: {
    danger: "#FF5A3D",
    warning: "#F2C94C",
    success: "#7DD3AC",
    info: "#7DD3FC",
  },
  shadow: {
    sm: "0 1px 2px rgba(0,0,0,0.4)",
    md: "0 4px 16px rgba(0,0,0,0.45)",
    lg: "0 16px 48px rgba(0,0,0,0.55)",
  },
};
