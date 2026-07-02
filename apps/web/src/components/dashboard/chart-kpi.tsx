"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AnimatedNumber, Sparkline, TONE_COLORS, useReduceOrPaper, type ChartTone } from "./chart-primitives";

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

export function KPITile({
  label,
  value,
  format,
  delta,
  invertDelta,
  trend,
  noTrendLabel,
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
  noTrendLabel?: string | undefined;
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
        ) : noTrendLabel ? (
          <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">{noTrendLabel}</span>
        ) : null}
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
