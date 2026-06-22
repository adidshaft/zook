"use client";

/**
 * SVG support visuals for the public home page.
 * - GridBackdrop: a subtle radially-faded grid that sits behind the hero
 *   to give the page a sense of place without competing with copy.
 * - MiniSparkline: a compact trend glyph for the KPI bar.
 */

export function GridBackdrop({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id="zk-grid"
          width="56"
          height="56"
          patternUnits="userSpaceOnUse"
          patternTransform="translate(0.5 0.5)"
        >
          <path
            d="M 56 0 L 0 0 0 56"
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="zk-grid-fade" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stopColor="white" stopOpacity="0.85" />
          <stop offset="55%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="zk-grid-mask">
          <rect width="100%" height="100%" fill="url(#zk-grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#zk-grid)" mask="url(#zk-grid-mask)" />
    </svg>
  );
}

/**
 * Tiny SVG sparkline that hints at recent check-in trend in the KPI bar.
 */
export function MiniSparkline({
  values,
  width = 64,
  height = 18,
  color = "var(--accent-strong)",
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id="zk-spark-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#zk-spark-fill)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
