"use client";

/**
 * Premium dashboard primitives — SVG charts and KPI tiles that animate
 * on mount. All charts are zero-dep, hand-rolled SVG with smooth motion
 * via framer-motion. They respect prefers-reduced-motion.
 */

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

function useReduceOrPaper(): boolean {
  const reduceSystem = useReducedMotion();
  if (reduceSystem) return true;
  if (typeof window !== "undefined" && document.documentElement.dataset.accent === "paper") {
    return true;
  }
  return false;
}

const TONE_COLORS = {
  lime: "var(--accent)",
  amber: "var(--feedback-warning)",
  sky: "var(--feedback-info)",
  rose: "var(--feedback-danger)",
  violet: "var(--accent)",
  paper: "var(--accent)",
} as const;

export type ChartTone = keyof typeof TONE_COLORS;

/* ─────────────────────────────────────────────────────────────────────────
 * Counter — animated number rolling up from 0 (or current value).
 * ────────────────────────────────────────────────────────────────────────── */

export function AnimatedNumber({
  value,
  format,
  duration = 1.2,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReduceOrPaper();
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) =>
    format ? format(v) : value % 1 === 0 ? Math.round(v).toLocaleString("en-IN") : v.toFixed(1),
  );

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    mv.set(value);
  }, [mv, reduce, value]);

  if (reduce) {
    return (
      <span ref={ref} {...(className != null ? { className } : {})}>
        {format ? format(value) : value.toLocaleString("en-IN")}
      </span>
    );
  }
  return (
    <span ref={ref} {...(className != null ? { className } : {})}>
      <motion.span>{display}</motion.span>
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Delta chip — ▲ +12.3% / ▼ −4.1% / — flat, with tone-aware coloring.
 * ────────────────────────────────────────────────────────────────────────── */

export function DeltaChip({
  delta,
  suffix = "%",
  invert = false,
}: {
  /** Positive = up, negative = down, 0 = flat. */
  delta: number | null | undefined;
  suffix?: string;
  /** If true, down is good (e.g. "expenses down" is good). */
  invert?: boolean;
}) {
  if (delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-tertiary)]">
        <Minus size={11} /> —
      </span>
    );
  }
  const isUp = delta > 0;
  const isFlat = delta === 0;
  const good = isFlat ? "neutral" : invert ? (isUp ? "bad" : "good") : isUp ? "good" : "bad";
  const tones: Record<string, string> = {
    good: "border-[color-mix(in_srgb,var(--feedback-success)_35%,transparent)] bg-[var(--surface-success-soft)] text-[var(--feedback-success)]",
    bad: "border-[color-mix(in_srgb,var(--feedback-danger)_35%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]",
    neutral: "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
  };
  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${tones[good]}`}
    >
      <Icon size={11} />
      {isUp ? "+" : ""}
      {delta.toFixed(1)}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Sparkline — tiny inline trend chart.
 * ────────────────────────────────────────────────────────────────────────── */

export function Sparkline({
  values,
  tone = "lime",
  width = 96,
  height = 28,
  className,
  showDot = true,
}: {
  values: number[];
  tone?: ChartTone;
  width?: number;
  height?: number;
  className?: string;
  showDot?: boolean;
}) {
  const id = useId();
  const reduce = useReduceOrPaper();
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2] as const);
  const path = `M ${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")}`;
  const area = `M 0,${height} L ${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} L ${width},${height} Z`;
  const color = TONE_COLORS[tone];
  const last = points[points.length - 1];
  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE }}
      />
      {showDot && last ? (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r="2.5"
          fill={color}
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        />
      ) : null}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * KPI tile — big number, label, sparkline, delta. Hero of any dashboard.
 * ────────────────────────────────────────────────────────────────────────── */

export function KPITile({
  label,
  value,
  format,
  delta,
  invertDelta,
  trend,
  tone = "lime",
  icon: Icon,
  href,
  caption,
}: {
  label: string;
  value: number;
  format?: ((v: number) => string) | undefined;
  delta?: number | null | undefined;
  invertDelta?: boolean | undefined;
  trend?: number[] | undefined;
  tone?: ChartTone;
  icon?: LucideIcon | undefined;
  href?: string | undefined;
  caption?: string | undefined;
}) {
  const color = TONE_COLORS[tone];
  const reduce = useReduceOrPaper();
  const className = `group relative overflow-hidden rounded-[22px] border border-[var(--border)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--bg-sunken)] p-5 transition-colors hover:border-[var(--border-strong)] ${
    href ? "cursor-pointer" : ""
  }`;
  const content = (
    <>
      {/* tone accent line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {label}
          </p>
          <p
            className="mt-3 font-bold tabular-nums leading-none text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.7rem, 2.4vw, 2.4rem)" }}
          >
            <AnimatedNumber value={value} {...(format ? { format } : {})} />
          </p>
          {caption ? (
            <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">{caption}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)]"
            style={{ borderColor: `color-mix(in srgb, ${color} 26%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)`, color }}
          >
            <Icon size={18} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
        {trend && trend.length > 1 ? (
          <Sparkline values={trend} tone={tone} width={80} height={24} className="shrink-0" />
        ) : (
          <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">No trend yet</span>
        )}
        {delta != null ? (
          <div className="shrink-0">
            <DeltaChip delta={delta} {...(invertDelta != null ? { invert: invertDelta } : {})} />
          </div>
        ) : null}
      </div>
    </>
  );

  if (href) {
    if (reduce) {
      return (
        <motion.a href={href} className={className}>
          {content}
        </motion.a>
      );
    }
    return (
      <motion.a
        href={href}
        className={className}
        layout
        whileHover={{ y: -2, scale: 1.002 }}
        whileTap={{ scale: 0.992 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        {content}
      </motion.a>
    );
  }

  if (reduce) {
    return <motion.div className={className}>{content}</motion.div>;
  }

  return (
    <motion.div
      className={className}
      layout
      whileHover={{ y: -2, scale: 1.002 }}
      whileTap={{ scale: 0.992 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      {content}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Line chart — smooth monotonic curve, gradient fill, animated draw.
 * ────────────────────────────────────────────────────────────────────────── */

function smoothPath(points: ReadonlyArray<readonly [number, number]>) {
  if (points.length < 2) return "";
  const first = points[0]!;
  const d: string[] = [`M ${first[0]},${first[1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(" ");
}

export function LineChart({
  series,
  labels,
  tone = "lime",
  height = 220,
  formatY,
  formatTooltip,
  ariaLabel,
}: {
  series: number[];
  labels: string[];
  tone?: ChartTone;
  height?: number;
  formatY?: (v: number) => string;
  formatTooltip?: (v: number, label: string) => string;
  ariaLabel?: string;
}) {
  const id = useId();
  const reduce = useReduceOrPaper();
  const color = TONE_COLORS[tone];
  const safeSeries = series.length > 1 ? series : [series[0] ?? 0, series[0] ?? 0];
  const safeLabels = labels.length > 1 ? labels : [labels[0] ?? "", labels[0] ?? ""];
  const padTop = 18;
  const padBottom = 28;
  const padLeft = 38;
  const padRight = 16;
  const innerHeight = height - padTop - padBottom;
  // We use viewBox + preserveAspectRatio so the chart is responsive without ResizeObserver.
  const viewW = 480;
  const innerWidth = viewW - padLeft - padRight;
  const max = Math.max(...safeSeries, 1);
  const min = Math.min(...safeSeries, 0);
  const range = Math.max(max - min, 1);
  const yTicks = useMemo(() => {
    const t = [0, 0.25, 0.5, 0.75, 1].map((f) => min + range * f);
    return t;
  }, [min, range]);
  const points = safeSeries.map((v, i) => {
    const x = padLeft + (i / Math.max(safeSeries.length - 1, 1)) * innerWidth;
    const y = padTop + innerHeight - ((v - min) / range) * innerHeight;
    return [x, y] as const;
  });
  const path = smoothPath(points);
  const lastIndex = points.length - 1;
  const last = points[lastIndex]!;
  const first = points[0]!;
  const area = `${path} L ${last[0]},${padTop + innerHeight} L ${first[0]},${padTop + innerHeight} Z`;
  const lastValue = safeSeries[lastIndex] ?? 0;
  const tooltipText = formatTooltip
    ? formatTooltip(lastValue, safeLabels[lastIndex] ?? "")
    : `${safeLabels[lastIndex] ?? ""}: ${formatY ? formatY(lastValue) : lastValue}`;
  const tooltipBoxWidth = Math.min(140, tooltipText.length * 7 + 16);

  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? "Trend chart"}
      viewBox={`0 0 ${viewW} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`line-area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {yTicks.map((tick, i) => {
        const y = padTop + innerHeight - ((tick - min) / range) * innerHeight;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={viewW - padRight}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray="2 4"
            />
            <text
              x={padLeft - 6}
              y={y + 3}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="end"
            >
              {formatY ? formatY(tick) : Math.round(tick).toString()}
            </text>
          </g>
        );
      })}
      {/* x labels */}
      {safeLabels.map((label, i) => {
        const x = padLeft + (i / Math.max(safeLabels.length - 1, 1)) * innerWidth;
        return (
          <text
            key={`${label}-${i}`}
            x={x}
            y={height - 8}
            fontSize="10"
            fill="var(--text-tertiary)"
            textAnchor={i === 0 ? "start" : i === safeLabels.length - 1 ? "end" : "middle"}
          >
            {label}
          </text>
        );
      })}
      {/* area + line */}
      <motion.path
        d={area}
        fill={`url(#line-area-${id})`}
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      {/* last point pulse */}
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r="11"
        fill={color}
        opacity="0.18"
        initial={reduce ? { scale: 1, opacity: 0.18 } : { scale: 0 }}
        animate={{ scale: [0.6, 1.4, 0.9], opacity: [0.3, 0, 0.3] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut", delay: 1 }}
        style={{ transformOrigin: `${last[0]}px ${last[1]}px` }}
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r="4"
        fill={color}
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1 }}
      />
      {/* tooltip */}
      <g
        transform={`translate(${Math.min(viewW - padRight - tooltipBoxWidth, Math.max(padLeft, last[0] - tooltipBoxWidth / 2))}, ${Math.max(padTop, last[1] - 38)})`}
      >
        <motion.rect
          width={tooltipBoxWidth}
          height="24"
          rx="6"
          fill={color}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        />
        <motion.text
          x={tooltipBoxWidth / 2}
          y="16"
          fontSize="11"
          fontWeight="700"
          fill="var(--text-inverse)"
          textAnchor="middle"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          {tooltipText}
        </motion.text>
      </g>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Bar chart — vertical bars with animated rise.
 * ────────────────────────────────────────────────────────────────────────── */

export function BarChart({
  series,
  labels,
  tone = "lime",
  height = 180,
  formatY,
}: {
  series: number[];
  labels: string[];
  tone?: ChartTone;
  height?: number;
  formatY?: (v: number) => string;
}) {
  const id = useId();
  const reduce = useReduceOrPaper();
  const color = TONE_COLORS[tone];
  const safeSeries = series.length ? series : [0];
  const safeLabels = labels.length ? labels : [""];
  const padTop = 14;
  const padBottom = 24;
  const padLeft = 32;
  const padRight = 12;
  const innerHeight = height - padTop - padBottom;
  const viewW = 480;
  const innerWidth = viewW - padLeft - padRight;
  const max = Math.max(...safeSeries, 1);
  const barCount = safeSeries.length;
  const slot = innerWidth / barCount;
  const barWidth = Math.min(34, slot * 0.62);

  return (
    <svg
      role="img"
      aria-label="Bar chart"
      viewBox={`0 0 ${viewW} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f, i) => {
        const tick = max * f;
        const y = padTop + innerHeight - f * innerHeight;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              x2={viewW - padRight}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray="2 4"
            />
            <text x={padLeft - 6} y={y + 3} fontSize="10" fill="var(--text-tertiary)" textAnchor="end">
              {formatY ? formatY(tick) : Math.round(tick).toString()}
            </text>
          </g>
        );
      })}
      {safeSeries.map((v, i) => {
        const x = padLeft + i * slot + (slot - barWidth) / 2;
        const h = (v / max) * innerHeight;
        const y = padTop + innerHeight - h;
        return (
          <g key={`${safeLabels[i]}-${i}`}>
            <motion.rect
              x={x}
              width={barWidth}
              rx="4"
              fill={`url(#bar-${id})`}
              initial={reduce ? { y, height: h } : { y: padTop + innerHeight, height: 0 }}
              animate={{ y, height: h }}
              transition={{ duration: 0.7, delay: 0.05 * i, ease: EASE }}
            />
            <text
              x={x + barWidth / 2}
              y={height - 8}
              fontSize="10"
              fill="var(--text-tertiary)"
              textAnchor="middle"
            >
              {safeLabels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Donut — animated arc with center label.
 * ────────────────────────────────────────────────────────────────────────── */

export function Donut({
  value,
  total,
  size = 140,
  thickness = 12,
  tone = "lime",
  centerLabel,
  centerSub,
}: {
  value: number;
  total: number;
  size?: number;
  thickness?: number;
  tone?: ChartTone;
  centerLabel?: ReactNode;
  centerSub?: string;
}) {
  const reduce = useReduceOrPaper();
  const color = TONE_COLORS[tone];
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 ? 0 : Math.max(0, Math.min(1, value / total));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={thickness}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          initial={reduce ? { strokeDashoffset: circumference * (1 - fraction) } : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fraction) }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {centerLabel ?? `${Math.round(fraction * 100)}%`}
          </div>
          {centerSub ? <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">{centerSub}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Donut legend row — color swatch + label + value.
 * ────────────────────────────────────────────────────────────────────────── */

export function LegendItem({
  tone = "lime",
  label,
  value,
}: {
  tone?: ChartTone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            background: TONE_COLORS[tone],
            filter: `drop-shadow(0 0 8px color-mix(in srgb, ${TONE_COLORS[tone]} 33%, transparent))`,
          }}
        />
        <span className="truncate text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Section hero — premium section header with icon + meta + optional CTA.
 * ────────────────────────────────────────────────────────────────────────── */

export function SectionHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = "lime",
  meta,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: ChartTone;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  const color = TONE_COLORS[tone];
  return (
    <header className="relative overflow-hidden rounded-[26px] border border-[var(--border)] bg-gradient-to-br from-[var(--surface-raised)] to-[var(--bg-sunken)] p-5">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}
      />
      <div className="flex items-start gap-4">
        {Icon ? (
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--border)]"
            style={{ borderColor: `color-mix(in srgb, ${color} 26%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)`, color }}
          >
            <Icon size={20} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {meta ? <div className="mt-4">{meta}</div> : null}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * ActivityRow — pre-styled item row with avatar/icon + copy + trailing.
 * Animates in with stagger when wrapped in motion list parent.
 * ────────────────────────────────────────────────────────────────────────── */

export function ActivityRow({
  icon: Icon,
  iconTone = "lime",
  title,
  subtitle,
  trailing,
  href,
  index = 0,
}: {
  icon?: LucideIcon;
  iconTone?: ChartTone;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  index?: number;
}) {
  const reduce = useReduceOrPaper();
  const color = TONE_COLORS[iconTone];
  const Tag = href ? motion.a : motion.div;
  return (
    <Tag
      {...(href ? { href } : {})}
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.04 * index, ease: EASE }}
      className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-3 py-2.5 transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
    >
      {Icon ? (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)]"
          style={{ borderColor: `color-mix(in srgb, ${color} 26%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)`, color }}
        >
          <Icon size={16} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">{title}</span>
        {subtitle ? <span className="block truncate text-xs text-[var(--text-tertiary)]">{subtitle}</span> : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </Tag>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Pulse dot — small live indicator.
 * ────────────────────────────────────────────────────────────────────────── */

export function PulseDot({ tone = "lime", size = 8 }: { tone?: ChartTone; size?: number }) {
  const color = TONE_COLORS[tone];
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 2, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      />
      <span className="relative h-full w-full rounded-full" style={{ background: color }} />
    </span>
  );
}
