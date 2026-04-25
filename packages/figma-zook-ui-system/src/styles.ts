import { TOKENS, glassFill, glassStroke, hexToRgb, solid } from "./tokens";

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

export interface StyleRegistry {
  colors: Record<string, PaintStyle>;
  text: Record<TextStyleName, TextStyle>;
  effects: {
    glassCard: EffectStyle;
    limeGlow: EffectStyle;
    softShadow: EffectStyle;
    backgroundBlur: EffectStyle;
  };
}

function rgba(hex: keyof typeof TOKENS.color, opacity: number): RGBA {
  const rgb = hexToRgb(TOKENS.color[hex]);
  return { ...rgb, a: opacity };
}

function setTextStyle(style: TextStyle, spec: (typeof TOKENS.type)[TextStyleName]): void {
  style.fontName = { family: TOKENS.font.family, style: spec.weight };
  style.fontSize = spec.size;
  style.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
  style.letterSpacing = { unit: "PIXELS", value: 0 };
}

export async function loadFonts(): Promise<void> {
  await Promise.all([
    figma.loadFontAsync(TOKENS.font.regular),
    figma.loadFontAsync(TOKENS.font.medium),
    figma.loadFontAsync(TOKENS.font.semibold),
    figma.loadFontAsync(TOKENS.font.bold)
  ]);
}

export function createStyles(): StyleRegistry {
  const colors: Record<string, PaintStyle> = {};
  const colorEntries = {
    "Color / Background": solid(TOKENS.color.background),
    "Color / Surface": solid(TOKENS.color.surface),
    "Color / Surface Raised": solid(TOKENS.color.surfaceRaised),
    "Color / Text Primary": solid(TOKENS.color.primaryText),
    "Color / Text Muted": solid(TOKENS.color.mutedText),
    "Color / Text Subtle": solid(TOKENS.color.subtleText),
    "Color / Brand Lime": solid(TOKENS.color.accent),
    "Color / Warning Amber": solid(TOKENS.color.warning),
    "Color / Danger": solid(TOKENS.color.danger),
    "Color / Glass Fill 05": glassFill(TOKENS.opacity.glassLow),
    "Color / Glass Fill 08": glassFill(TOKENS.opacity.glassHigh),
    "Color / Glass Stroke": glassStroke()
  };

  for (const [name, paint] of Object.entries(colorEntries)) {
    const style = figma.createPaintStyle();
    style.name = name;
    style.paints = [paint];
    colors[name] = style;
  }

  const text = {} as Record<TextStyleName, TextStyle>;
  for (const key of Object.keys(TOKENS.type) as TextStyleName[]) {
    const style = figma.createTextStyle();
    style.name = `Type / ${key}`;
    setTextStyle(style, TOKENS.type[key]);
    text[key] = style;
  }

  const softShadow = figma.createEffectStyle();
  softShadow.name = "Effect / Soft Operational Shadow";
  softShadow.effects = [
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

  const limeGlow = figma.createEffectStyle();
  limeGlow.name = "Effect / Subtle Lime Glow";
  limeGlow.effects = [
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

  const backgroundBlur = figma.createEffectStyle();
  backgroundBlur.name = "Effect / Glass Background Blur";
  backgroundBlur.effects = [{ type: "BACKGROUND_BLUR", radius: 18, visible: true }];

  const glassCard = figma.createEffectStyle();
  glassCard.name = "Effect / Glass Card Composite";
  glassCard.effects = [...softShadow.effects, ...backgroundBlur.effects];

  return {
    colors,
    text,
    effects: { glassCard, limeGlow, softShadow, backgroundBlur }
  };
}
