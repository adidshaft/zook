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
    accentSoft: "rgba(31,62,36,0.06)",
    dangerSoft: "rgba(220,38,38,0.08)",
    warningSoft: "rgba(217,119,6,0.08)",
    successSoft: "rgba(22,163,74,0.08)",
  },
  text: {
    primary: "#11150F",
    secondary: "#3F463C",
    tertiary: "#6F7769",
    inverse: "#FFFFFF",
    onAccent: "#FFFFFF",
    onDanger: "#FFFFFF",
    onWarning: "#11150F",
  },
  border: {
    subtle: "rgba(17,21,15,0.08)",
    default: "rgba(17,21,15,0.14)",
    strong: "rgba(17,21,15,0.22)",
    focus: "#1F3E24",
  },
  accent: {
    base: "#1F3E24",
    soft: "#EEF0EA",
    strong: "#1F3E24",
    fill: "#1F3E24",
  },
  feedback: {
    danger: "#B91C1C",
    warning: "#B45309",
    success: "#15803D",
    info: "#0369A1",
  },
  shadow: {
    sm: "0 1px 2px rgba(17,21,15,0.06)",
    md: "0 4px 12px rgba(17,21,15,0.08)",
    lg: "0 16px 40px rgba(17,21,15,0.12)",
  },
};

