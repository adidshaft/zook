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
  fontName: FontName;
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

function fontForWeight(weight: string): FontName {
  if (weight === "Bold") return TOKENS.font.bold;
  if (weight === "Semi Bold") return TOKENS.font.semibold;
  if (weight === "Medium") return TOKENS.font.medium;
  return TOKENS.font.regular;
}

export async function loadTokenFonts(): Promise<void> {
  await Promise.all([
    figma.loadFontAsync(TOKENS.font.regular),
    figma.loadFontAsync(TOKENS.font.medium),
    figma.loadFontAsync(TOKENS.font.semibold),
    figma.loadFontAsync(TOKENS.font.bold)
  ]);
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

function stylePaint(hex: keyof typeof TOKENS.color, opacity = 1): SolidPaint {
  const { a, ...color } = rgba(hex, opacity);
  return { type: "SOLID", color, opacity: a };
}

async function upsertPaintStyle(name: string, paints: Paint[]): Promise<void> {
  const existing = (await figma.getLocalPaintStylesAsync()).find((style) => style.name === name);
  const style = existing ?? figma.createPaintStyle();
  style.name = name;
  style.paints = paints;
}

async function upsertTextStyle(name: string, spec: TextSpec): Promise<void> {
  const existing = (await figma.getLocalTextStylesAsync()).find((style) => style.name === name);
  const style = existing ?? figma.createTextStyle();
  style.name = name;
  style.fontName = spec.fontName;
  style.fontSize = spec.fontSize;
  style.lineHeight = spec.lineHeight;
  style.letterSpacing = { unit: "PIXELS", value: 0 };
  style.paragraphSpacing = 0;
}

async function upsertEffectStyle(name: string, effects: Effect[]): Promise<void> {
  const existing = (await figma.getLocalEffectStylesAsync()).find((style) => style.name === name);
  const style = existing ?? figma.createEffectStyle();
  style.name = name;
  style.effects = effects;
}

export async function createTokenStyles(): Promise<StyleRegistry> {
  const text = {} as Record<TextStyleName, TextSpec>;
  for (const key of Object.keys(TOKENS.type) as TextStyleName[]) {
    const spec = TOKENS.type[key];
    text[key] = {
      name: `Type / ${key}`,
      fontSize: spec.size,
      lineHeight: { unit: "PIXELS", value: spec.lineHeight },
      weight: spec.weight,
      fontName: fontForWeight(spec.weight)
    };
    await upsertTextStyle(`Zook / Type / ${key}`, text[key]);
  }

  const colors = {} as Record<string, Paint>;
  for (const [name, hex] of Object.entries(TOKENS.color)) {
    void hex;
    const paint = stylePaint(name as keyof typeof TOKENS.color);
    colors[name] = paint;
    await upsertPaintStyle(`Zook / Color / ${name}`, [paint]);
  }
  await upsertPaintStyle("Zook / Glass / Low", [stylePaint("white", TOKENS.opacity.glassLow)]);
  await upsertPaintStyle("Zook / Glass / High", [stylePaint("white", TOKENS.opacity.glassHigh)]);
  await upsertPaintStyle("Zook / Glass / Stroke", [stylePaint("white", TOKENS.opacity.glassStroke)]);

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
  await upsertEffectStyle("Zook / Effect / Glass Card", [...softShadow, ...backgroundBlur]);
  await upsertEffectStyle("Zook / Effect / Lime Glow", limeGlow);
  await upsertEffectStyle("Zook / Effect / Soft Shadow", softShadow);
  await upsertEffectStyle("Zook / Effect / Background Blur", backgroundBlur);

  return {
    colors,
    text,
    effects: {
      glassCard: [...softShadow, ...backgroundBlur],
      limeGlow,
      softShadow,
      backgroundBlur
    }
  };
}
