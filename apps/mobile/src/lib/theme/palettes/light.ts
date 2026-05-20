import type { Palette } from "../tokens";

export const lightPalette: Palette = {
  bg: {
    app: "#F7F8F4",
    elevated: "#FFFFFF",
    sunken: "#EEF0EA",
    overlay: "rgba(17,21,15,0.45)",
  },
  surface: {
    default: "#FFFFFF",
    raised: "#FFFFFF",
    accentSoft: "rgba(166,224,68,0.16)",
    dangerSoft: "rgba(220,38,38,0.10)",
    warningSoft: "rgba(217,119,6,0.12)",
    successSoft: "rgba(22,163,74,0.10)",
  },
  text: {
    primary: "#11150F",
    secondary: "#3F463C",
    tertiary: "#687260",
    inverse: "#FFFFFF",
    onAccent: "#11150F",
    onDanger: "#FFFFFF",
    onWarning: "#11150F",
  },
  border: {
    subtle: "rgba(17,21,15,0.08)",
    default: "rgba(17,21,15,0.14)",
    strong: "rgba(17,21,15,0.22)",
    focus: "#A6E044",
  },
  accent: {
    base: "#A6E044",
    soft: "#C7F472",
    strong: "#7CB427",
    fill: "#A6E044",
  },
  feedback: {
    danger: "#DC2626",
    warning: "#D97706",
    success: "#16A34A",
    info: "#0284C7",
  },
  shadow: {
    sm: "0 1px 2px rgba(17,21,15,0.06)",
    md: "0 4px 12px rgba(17,21,15,0.08)",
    lg: "0 16px 40px rgba(17,21,15,0.12)",
  },
};
