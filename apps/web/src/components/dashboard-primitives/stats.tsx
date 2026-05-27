"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { GlassCard, Pill, type PillTone } from "../glass-card";
import { fadeUpVariants } from "./layout";

export function toneFromStatus(value: string | null | undefined): PillTone {
  const normalized = value?.toLowerCase() ?? "";
  if (
    normalized.includes("active") ||
    normalized.includes("approved") ||
    normalized.includes("succeeded") ||
    normalized.includes("published") ||
    normalized.includes("ready") ||
    normalized.includes("sent") ||
    normalized.includes("fulfilled")
  ) {
    return "lime";
  }
  if (
    normalized.includes("failed") ||
    normalized.includes("rejected") ||
    normalized.includes("suspended") ||
    normalized.includes("cancelled") ||
    normalized.includes("expired") ||
    normalized.includes("refunded")
  ) {
    return "red";
  }
  if (
    normalized.includes("review") ||
    normalized.includes("pending") ||
    normalized.includes("scheduled") ||
    normalized.includes("draft") ||
    normalized.includes("trial") ||
    normalized.includes("flagged") ||
    normalized.includes("open")
  ) {
    return "amber";
  }
  if (normalized.includes("default") || normalized.includes("manual")) {
    return "blue";
  }
  return "neutral";
}

export function toneFromSeverity(value: string | null | undefined): PillTone {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("critical") || normalized.includes("high")) {
    return "red";
  }
  if (normalized.includes("medium") || normalized.includes("moderate")) {
    return "amber";
  }
  if (normalized.includes("low") || normalized.includes("info")) {
    return "blue";
  }
  return "neutral";
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: PillTone;
  className?: string | undefined;
}) {
  const accents: Record<PillTone, string> = {
    neutral: "from-[var(--border-subtle)] via-transparent to-transparent",
    lime: "from-[var(--surface-accent-soft)] via-[var(--surface-accent-soft)]/40 to-transparent",
    amber: "from-[var(--surface-warning-soft)] via-[var(--surface-warning-soft)]/40 to-transparent",
    red: "from-[var(--surface-danger-soft)] via-[var(--surface-danger-soft)]/40 to-transparent",
    blue: "from-[var(--surface-info-soft)] via-[var(--surface-info-soft)]/40 to-transparent",
  };

  return (
    <motion.div variants={fadeUpVariants}>
      <GlassCard 
        variant="strong" 
        className={clsx("group relative overflow-hidden", className)}
        interactive={true}
      >
        <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-70 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100", accents[tone])} />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--text-tertiary)]">{label}</p>
            {icon ? <div className="text-[var(--text-secondary)]">{icon}</div> : null}
          </div>
          <div className="metric mt-4 text-4xl font-semibold text-[var(--text-primary)]">{value}</div>
          {delta ? <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{delta}</p> : null}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function MetricChip({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  icon?: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <Pill tone={tone} className={clsx("px-3.5 py-1.5", className)}>
      {icon}
      {children}
    </Pill>
  );
}

export function ReadoutGrid({
  items,
  columns = 2,
  className,
}: {
  items: Array<{ label: string; value: React.ReactNode; meta?: React.ReactNode }>;
  columns?: 1 | 2 | 3 | 4;
  className?: string | undefined;
}) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  };

  return (
    <dl className={clsx("grid gap-3", columnClasses[columns], className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-[22px] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            {item.label}
          </dt>
          <dd className="mt-2 min-w-0 break-words text-lg font-semibold text-[var(--text-primary)]">
            {item.value}
          </dd>
          {item.meta ? (
            <dd className="mt-1 min-w-0 break-words text-xs leading-5 text-[var(--text-tertiary)]">{item.meta}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function MiniTrend({
  values = [],
  tone = "lime",
  label = "No data yet",
}: {
  values?: number[];
  tone?: "lime" | "blue" | "amber";
  label?: string;
}) {
  if (!values.length) {
    return (
      <div className="flex h-14 w-full items-center gap-3" role="img" aria-label={label}>
        <span className="h-px flex-1 border-t border-dashed border-[var(--border)]" />
        <span className="text-xs text-[var(--text-tertiary)]">No data yet</span>
      </div>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 42 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = tone === "blue" ? "#7dd3fc" : tone === "amber" ? "#f2c94c" : "#b9f455";
  return (
    <svg viewBox="0 0 100 48" role="img" aria-label={label} className="h-14 w-full overflow-visible">
      <defs>
        <linearGradient id={`mini-trend-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,48 ${points} 100,48`}
        fill={`url(#mini-trend-${tone})`}
        stroke="none"
      />
      <polyline points={points} fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export function RevenueMiniChart(props: Parameters<typeof MiniTrend>[0]) {
  return <MiniTrend {...props} />;
}
