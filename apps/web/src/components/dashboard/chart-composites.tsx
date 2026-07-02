"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EASE, TONE_COLORS, useReduceOrPaper, type ChartTone } from "./chart-primitives";

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
          initial={
            reduce
              ? { strokeDashoffset: circumference * (1 - fraction) }
              : { strokeDashoffset: circumference }
          }
          animate={{ strokeDashoffset: circumference * (1 - fraction) }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {centerLabel ?? `${Math.round(fraction * 100)}%`}
          </div>
          {centerSub ? (
            <div className="mt-1 text-[10px] text-[var(--text-tertiary)]">{centerSub}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
      <div className="flex min-w-0 items-center gap-2">
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
      <div className="flex items-start gap-4">
        {Icon ? (
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[var(--border)]"
            style={{
              borderColor: `color-mix(in srgb, ${color} 26%, transparent)`,
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
              color,
            }}
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
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {meta ? <div className="mt-4">{meta}</div> : null}
    </header>
  );
}

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
          style={{
            borderColor: `color-mix(in srgb, ${color} 26%, transparent)`,
            background: `color-mix(in srgb, ${color} 8%, transparent)`,
            color,
          }}
        >
          <Icon size={16} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs text-[var(--text-tertiary)]">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </Tag>
  );
}

export function StatusDot({ tone = "lime", size = 8 }: { tone?: ChartTone; size?: number }) {
  const color = TONE_COLORS[tone];
  return (
    <span className="inline-flex rounded-full" style={{ width: size, height: size, background: color }} />
  );
}
