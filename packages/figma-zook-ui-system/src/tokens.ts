export type Hex = string;

export const TOKENS = {
  brand: {
    name: "Zook",
    product: "Product UI System v1",
    subtitle: "India-first operating system for gyms"
  },
  frame: {
    mobile: { width: 390, height: 844 },
    cover: { width: 1440, height: 1024 }
  },
  color: {
    background: "#070908",
    surface: "#10140f",
    surfaceRaised: "#171d14",
    primaryText: "#f4f7ef",
    mutedText: "#aeb8a8",
    subtleText: "#778273",
    accent: "#b9f455",
    accentSoft: "#d7ff8a",
    warning: "#f2c94c",
    danger: "#ff5a3d",
    black: "#000000",
    white: "#ffffff"
  } satisfies Record<string, Hex>,
  opacity: {
    glassLow: 0.05,
    glassHigh: 0.08,
    glassStroke: 0.14,
    subtleStroke: 0.1,
    dim: 0.56
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    round: 999
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48
  },
  font: {
    family: "Inter",
    regular: { family: "Inter", style: "Regular" } as FontName,
    medium: { family: "Inter", style: "Medium" } as FontName,
    semibold: { family: "Inter", style: "Semi Bold" } as FontName,
    bold: { family: "Inter", style: "Bold" } as FontName
  },
  type: {
    display: { size: 56, lineHeight: 62, weight: "Bold" },
    h1: { size: 30, lineHeight: 36, weight: "Bold" },
    h2: { size: 24, lineHeight: 30, weight: "Semi Bold" },
    h3: { size: 18, lineHeight: 24, weight: "Semi Bold" },
    body: { size: 15, lineHeight: 22, weight: "Regular" },
    bodyStrong: { size: 15, lineHeight: 22, weight: "Semi Bold" },
    small: { size: 13, lineHeight: 18, weight: "Regular" },
    caption: { size: 11, lineHeight: 14, weight: "Medium" },
    metric: { size: 28, lineHeight: 34, weight: "Bold" }
  },
  shadow: {
    card: { x: 0, y: 18, blur: 42, spread: -18, opacity: 0.6 },
    glow: { x: 0, y: 0, blur: 28, spread: -2, opacity: 0.24 }
  }
} as const;

export function hexToRgb(hex: Hex): RGB {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

export function solid(hex: Hex, opacity = 1): SolidPaint {
  return { type: "SOLID", color: hexToRgb(hex), opacity };
}

export function glassFill(opacity: number = TOKENS.opacity.glassHigh): SolidPaint {
  return solid(TOKENS.color.white, opacity);
}

export function glassStroke(opacity: number = TOKENS.opacity.glassStroke): SolidPaint {
  return solid(TOKENS.color.white, opacity);
}

export function layoutGrid(): LayoutGrid {
  return {
    pattern: "COLUMNS",
    sectionSize: 1,
    visible: false,
    color: { r: 1, g: 1, b: 1, a: 0.08 },
    alignment: "STRETCH",
    gutterSize: 8,
    count: 4,
    offset: 20
  };
}
