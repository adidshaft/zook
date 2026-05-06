export const zookColors = {
  graphite950: "#070908",
  graphite900: "#101310",
  graphite800: "#171c18",
  graphite700: "#222820",
  graphite600: "#333b32",
  surface: "rgba(255, 255, 255, 0.06)",
  glass: "rgba(255, 255, 255, 0.06)",
  glassStrong: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.14)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  text: "#f4f7ef",
  textMuted: "#aeb8a8",
  lime: "#b9f455",
  limeDim: "rgba(185, 244, 85, 0.16)",
  limeBorder: "rgba(185, 244, 85, 0.45)",
  limeDeep: "#6fad21",
  amber: "#f2c94c",
  red: "#ff5a3d",
  blue: "#7dd3fc",
} as const;

export const zookRadii = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 28,
  xxl: 32,
  pill: 999,
} as const;

export const zookSpacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const zookTypography = {
  family:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  display: {
    fontSize: 48,
    lineHeight: 1.04,
    fontWeight: "760",
  },
  h1: {
    fontSize: 34,
    lineHeight: 1.08,
    fontWeight: "740",
  },
  h2: {
    fontSize: 24,
    lineHeight: 1.18,
    fontWeight: "700",
  },
  body: {
    fontSize: 15,
    lineHeight: 1.55,
    fontWeight: "450",
  },
  metric: {
    fontSize: 38,
    lineHeight: 1,
    fontWeight: "780",
    fontVariantNumeric: "tabular-nums",
  },
} as const;

export const zookShadows = {
  glass: "0 18px 42px rgba(0, 0, 0, 0.34)",
  glowLime: "0 16px 36px rgba(185, 244, 85, 0.14)",
  inset: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
} as const;

export const zookTokens = {
  colors: zookColors,
  radii: zookRadii,
  spacing: zookSpacing,
  typography: zookTypography,
  shadows: zookShadows,
} as const;

export type ZookPlanNameInput = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  type?: string | null;
  durationDays?: number | null;
  validityDays?: number | null;
  visitLimit?: number | null;
};

function isInternalPlanName(value: string) {
  return (
    /\b(plan|branch|owner|playwright|pilot)\b.*\d{7,}/i.test(value) ||
    /\d{10,}/.test(value) ||
    /^[a-z]+_[a-z0-9]{10,}$/i.test(value)
  );
}

function durationLabel(days?: number | null) {
  if (!days || days <= 0) return "Monthly";
  if (days <= 14) return "Trial";
  if (days <= 45) return "Monthly";
  if (days <= 110) return "Quarterly";
  if (days <= 220) return "Half-yearly";
  return "Annual";
}

function visitLabel(limit?: number | null) {
  if (!limit || limit >= 999) return "Unlimited";
  if (limit === 1) return "1 visit";
  return `${limit} visits`;
}

export function resolvePlanName(plan?: ZookPlanNameInput | null) {
  const rawName = (plan?.name ?? plan?.title ?? "").trim().replace(/\s+/g, " ");
  if (rawName && !isInternalPlanName(rawName)) {
    return rawName.length > 42 ? `${rawName.slice(0, 39).trim()}...` : rawName;
  }

  const days = plan?.durationDays ?? plan?.validityDays;
  return `${durationLabel(days)} · ${visitLabel(plan?.visitLimit)}`;
}
