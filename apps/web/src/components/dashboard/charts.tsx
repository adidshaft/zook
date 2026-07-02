"use client";

/**
 * Dashboard primitives — SVG charts and KPI tiles with reduced-motion-aware
 * mount transitions.
 */

import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import {
  EASE,
  TONE_COLORS,
  smoothPath,
  useReduceOrPaper,
  type ChartTone,
} from "./chart-primitives";

export type { ChartTone } from "./chart-primitives";
export { DeltaChip, KPITile } from "./chart-kpi";
export { ActivityRow, Donut, LegendItem, SectionHero, StatusDot } from "./chart-composites";

/* ─────────────────────────────────────────────────────────────────────────
 * Line chart — smooth monotonic curve, gradient fill, animated draw.
 * ────────────────────────────────────────────────────────────────────────── */

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
  ariaLabel: string;
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
      aria-label={ariaLabel}
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
  ariaLabel,
}: {
  series: number[];
  labels: string[];
  tone?: ChartTone;
  height?: number;
  formatY?: (v: number) => string;
  ariaLabel: string;
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
      aria-label={ariaLabel}
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
