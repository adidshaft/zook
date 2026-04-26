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
  style.fontSize = spec.size;
  style.lineHeight = { unit: "PIXELS", value: spec.lineHeight };
  style.letterSpacing = { unit: "PIXELS", value: 0 };
}

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error);
      }
    );
  });
}

async function safeLoadFont(font: FontName): Promise<boolean> {
  try {
    await timeout(figma.loadFontAsync(font), 2500, `${font.family} ${font.style}`);
    return true;
  } catch (error) {
    console.warn(`Could not load ${font.family} ${font.style}`, error);
    return false;
  }
}

export async function loadFonts(): Promise<void> {
  const requiredFonts = [TOKENS.font.regular, TOKENS.font.medium, TOKENS.font.semibold, TOKENS.font.bold];
  for (const font of requiredFonts) {
    await safeLoadFont(font);
  }
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
  backgroundBlur.effects = [{ type: "BACKGROUND_BLUR", radius: 18, visible: true, blurType: "NORMAL" }];

  const glassCard = figma.createEffectStyle();
  glassCard.name = "Effect / Glass Card Composite";
  glassCard.effects = [...softShadow.effects, ...backgroundBlur.effects];

  return {
    colors,
    text,
    effects: { glassCard, limeGlow, softShadow, backgroundBlur }
  };
}
