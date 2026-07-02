"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import { formatNumber } from "@/lib/format";

export const EASE = [0.22, 1, 0.36, 1] as const;

export function useReduceOrPaper(): boolean {
  const reduceSystem = useReducedMotion();
  if (reduceSystem) return true;
  if (typeof window !== "undefined" && document.documentElement.dataset.accent === "paper") {
    return true;
  }
  return false;
}

export const TONE_COLORS = {
  lime: "var(--accent)",
  amber: "var(--feedback-warning)",
  sky: "var(--feedback-info)",
  rose: "var(--feedback-danger)",
  violet: "var(--accent)",
  paper: "var(--accent)",
} as const;

export type ChartTone = keyof typeof TONE_COLORS;

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
    format
      ? format(v)
      : value % 1 === 0
        ? formatNumber(Math.round(v))
        : formatNumber(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
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
        {format
          ? format(value)
          : formatNumber(value, {
              maximumFractionDigits: value % 1 === 0 ? 0 : 1,
              minimumFractionDigits: value % 1 === 0 ? 0 : 1,
            })}
      </span>
    );
  }
  return (
    <span ref={ref} {...(className != null ? { className } : {})}>
      <motion.span>{display}</motion.span>
    </span>
  );
}

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

export function smoothPath(points: ReadonlyArray<readonly [number, number]>) {
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
    d.push(
      `C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
    );
  }
  return d.join(" ");
}
