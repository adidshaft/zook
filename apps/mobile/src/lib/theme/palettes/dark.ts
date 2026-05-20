import type { Palette } from "../tokens";

export const darkPalette: Palette = {
  bg: {
    app: "#070908",
    elevated: "#0F1411",
    sunken: "#050706",
    overlay: "rgba(0,0,0,0.55)",
  },
  surface: {
    default: "rgba(255,255,255,0.04)",
    raised: "rgba(255,255,255,0.07)",
    accentSoft: "rgba(185,244,85,0.10)",
    dangerSoft: "rgba(255,90,61,0.12)",
    warningSoft: "rgba(242,201,76,0.12)",
    successSoft: "rgba(125,211,172,0.12)",
  },
  text: {
    primary: "#F4F7EF",
    secondary: "#C7CFC0",
    // AA on bg.app and readable on raised surfaces; reserve tertiary for metadata only.
    tertiary: "#8B9586",
    inverse: "#11150F",
    onAccent: "#11150F",
    onDanger: "#FFFFFF",
    onWarning: "#11150F",
  },
  border: {
    subtle: "rgba(255,255,255,0.08)",
    default: "rgba(255,255,255,0.14)",
    strong: "rgba(255,255,255,0.22)",
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
    sm: "0 1px 2px rgba(0,0,0,0.3)",
    md: "0 4px 12px rgba(0,0,0,0.35)",
    lg: "0 16px 40px rgba(0,0,0,0.45)",
  },
};
