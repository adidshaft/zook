export type RgbColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

const hexPattern = /^#(?<hex>[0-9a-f]{3}|[0-9a-f]{6})$/i;
const rgbaPattern =
  /^rgba?\(\s*(?<r>\d{1,3})\s*,\s*(?<g>\d{1,3})\s*,\s*(?<b>\d{1,3})(?:\s*,\s*(?<a>0|1|0?\.\d+))?\s*\)$/i;

function normalizeChannel(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 255) {
    throw new Error(`Invalid RGB channel: ${value}`);
  }
  return value;
}

function normalizeAlpha(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid alpha channel: ${value}`);
  }
  return value;
}

export function parseColor(value: string): RgbColor {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(hexPattern);
  if (hexMatch?.groups?.hex) {
    const raw = hexMatch.groups.hex;
    const hex =
      raw.length === 3
        ? raw
            .split("")
            .map((part) => part + part)
            .join("")
        : raw;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgbaMatch = trimmed.match(rgbaPattern);
  if (rgbaMatch?.groups) {
    return {
      r: normalizeChannel(Number(rgbaMatch.groups.r)),
      g: normalizeChannel(Number(rgbaMatch.groups.g)),
      b: normalizeChannel(Number(rgbaMatch.groups.b)),
      a: normalizeAlpha(rgbaMatch.groups.a === undefined ? 1 : Number(rgbaMatch.groups.a)),
    };
  }

  throw new Error(`Unsupported color: ${value}`);
}

export function composite(foreground: RgbColor, background: RgbColor): RgbColor {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    a: alpha,
  };
}

function linearize(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(color: RgbColor) {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(foreground: RgbColor, background: RgbColor) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrast(foreground: string, background: string, canvas: string) {
  const base = parseColor(canvas);
  const resolvedBackground = composite(parseColor(background), base);
  const resolvedForeground = composite(parseColor(foreground), resolvedBackground);
  return contrastRatio(resolvedForeground, resolvedBackground);
}
