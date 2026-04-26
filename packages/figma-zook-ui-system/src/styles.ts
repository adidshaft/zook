import { TOKENS } from "./tokens";

export type TextStyleName =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyStrong"
  | "small"
  | "caption"
  | "metric";

export interface TextSpec {
  name: string;
  fontSize: number;
  lineHeight: { unit: "PIXELS"; value: number };
  weight: string;
}

export interface StyleRegistry {
  colors: Record<string, Paint>;
  text: Record<TextStyleName, TextSpec>;
  effects: {
    glassCard: Effect[];
    limeGlow: Effect[];
    softShadow: Effect[];
    backgroundBlur: Effect[];
  };
}

function rgba(hex: keyof typeof TOKENS.color, opacity: number): RGBA {
  const normalized = TOKENS.color[hex].replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
    a: opacity
  };
}

export function createTokenStyles(): StyleRegistry {
  const text = {} as Record<TextStyleName, TextSpec>;
  for (const key of Object.keys(TOKENS.type) as TextStyleName[]) {
    const spec = TOKENS.type[key];
    text[key] = {
      name: `Type / ${key}`,
      fontSize: spec.size,
      lineHeight: { unit: "PIXELS", value: spec.lineHeight },
      weight: spec.weight
    };
  }

  const softShadow: Effect[] = [
    {
      type: "DROP_SHADOW",
      color: rgba("black", TOKENS.shadow.card.opacity),
      offset: { x: TOKENS.shadow.card.x, y: TOKENS.shadow.card.y },
      radius: TOKENS.shadow.card.blur,
      spread: TOKENS.shadow.card.spread,
      visible: true,
      blendMode: "NORMAL"
    }
  ];
  const limeGlow: Effect[] = [
    {
      type: "DROP_SHADOW",
      color: rgba("accent", TOKENS.shadow.glow.opacity),
      offset: { x: TOKENS.shadow.glow.x, y: TOKENS.shadow.glow.y },
      radius: TOKENS.shadow.glow.blur,
      spread: TOKENS.shadow.glow.spread,
      visible: true,
      blendMode: "NORMAL"
    }
  ];
  const backgroundBlur: Effect[] = [{ type: "BACKGROUND_BLUR", radius: 18, visible: true, blurType: "NORMAL" }];

  return {
    colors: {},
    text,
    effects: {
      glassCard: [...softShadow, ...backgroundBlur],
      limeGlow,
      softShadow,
      backgroundBlur
    }
  };
}
