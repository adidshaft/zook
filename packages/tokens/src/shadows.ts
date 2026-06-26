export type ElevationLevel = 1 | 2 | 3 | 4 | 6;

type ShadowMetrics = {
  elevation: number;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
};

type ElevationOverrides = Partial<ShadowMetrics>;

const elevationScale: Record<ElevationLevel, ShadowMetrics> = {
  1: {
    elevation: 1,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  2: {
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  3: {
    elevation: 3,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  4: {
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  6: {
    elevation: 6,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
};

export function elevation(
  level: ElevationLevel,
  shadowColor = "#000000",
  overrides?: ElevationOverrides,
) {
  const metrics = elevationScale[level];
  return {
    shadowColor,
    shadowOpacity: overrides?.shadowOpacity ?? metrics.shadowOpacity,
    shadowRadius: overrides?.shadowRadius ?? metrics.shadowRadius,
    shadowOffset: overrides?.shadowOffset ?? metrics.shadowOffset,
    elevation: overrides?.elevation ?? metrics.elevation,
  };
}

export const shadows = {
  glass: elevation(1, "#000000", {
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
  }),
  card: elevation(1, "#000000", {
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  }),
};

export const shadowIntensity = {
  subtle: 0.06,
  normal: 0.12,
  strong: 0.18,
};
