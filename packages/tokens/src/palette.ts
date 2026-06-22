/*
 * Brand accent pairing:
 * - Dark mode uses lime for accent.base/accent.fill with black text.onAccent.
 * - Light mode uses the safer deep green for accent.base/accent.fill with white text.onAccent.
 * - Never use lime as a text or icon color on light backgrounds; consume palette.accent.base
 *   from the active theme so light mode receives green automatically.
 */

export type Palette = {
  bg: {
    app: string;
    elevated: string;
    sunken: string;
    overlay: string;
  };
  surface: {
    default: string;
    raised: string;
    accentSoft: string;
    dangerSoft: string;
    warningSoft: string;
    successSoft: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    onAccent: string;
    onDanger: string;
    onWarning: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  accent: {
    base: string;
    soft: string;
    strong: string;
    fill: string;
  };
  feedback: {
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
};

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
    tertiary: "#66705E",
    inverse: "#FFFFFF",
    onAccent: "#FFFFFF",
    onDanger: "#FFFFFF",
    onWarning: "#FFFFFF",
  },
  border: {
    subtle: "rgba(17,21,15,0.08)",
    default: "rgba(17,21,15,0.14)",
    strong: "rgba(17,21,15,0.22)",
    focus: "#1F3E24",
  },
  accent: {
    base: "#1F3E24",
    soft: "#DCEAD8",
    strong: "#1F3E24",
    fill: "#1F3E24",
  },
  feedback: {
    danger: "#B91C1C",
    warning: "#B45309",
    success: "#15803D",
    info: "#0369A1",
  },
};

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
    onDanger: "#11150F",
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
};
