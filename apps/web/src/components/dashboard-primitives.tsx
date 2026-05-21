"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { motion, type Variants } from "framer-motion";
import { AlertTriangle, Check, Circle, X } from "lucide-react";
import { GlassCard, Pill, ProductPanel, type PillTone } from "./glass-card";
import { HelpHint } from "./ui";

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

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 400, damping: 30 } 
  },
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  badge,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className={clsx("flex flex-col justify-between gap-4 md:flex-row md:items-start", className)}
    >
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-2xl">{title}</h2>
          {description ? (
            <HelpHint label={title} title={title}>
              {description}
            </HelpHint>
          ) : null}
          {badge}
        </div>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </motion.div>
  );
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
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
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

export function DashboardPageShell({
  children,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <ProductPanel 
      className={className} 
      variants={staggerContainerVariants} 
      initial="hidden" 
      animate="show"
    >
      <SectionHeader
        {...(eyebrow ? { eyebrow } : {})}
        title={title}
        {...(description ? { description } : {})}
        {...(action ? { action } : {})}
      />
      <div className="mt-5">{children}</div>
    </ProductPanel>
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

export function StatusDot({
  tone = "neutral",
  pulse = false,
}: {
  tone?: PillTone;
  pulse?: boolean;
}) {
  const tones: Record<PillTone, string> = {
    neutral: "bg-[var(--text-tertiary)] shadow-[0_0_0_4px_var(--border-subtle)]",
    lime: "bg-[var(--accent)] shadow-[0_0_0_4px_var(--surface-accent-soft)]",
    amber: "bg-[var(--feedback-warning)] shadow-[0_0_0_4px_var(--surface-warning-soft)]",
    red: "bg-[var(--feedback-danger)] shadow-[0_0_0_4px_var(--surface-danger-soft)]",
    blue: "bg-[var(--feedback-info)] shadow-[0_0_0_4px_var(--surface-info-soft)]",
  };
  return (
    <span
      className={clsx(
        "inline-block h-2.5 w-2.5 rounded-full",
        tones[tone],
        pulse ? "animate-pulse" : null,
      )}
      aria-hidden="true"
    />
  );
}

export function AvatarInitials({
  name,
  className,
}: {
  name?: string | null;
  className?: string | undefined;
}) {
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ZK";
  return (
    <span
      className={clsx(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-primary)]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function ActionRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return <div className={clsx("flex flex-wrap items-center gap-2", className)}>{children}</div>;
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

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      className={clsx(
        "rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-raised)]/50 p-6",
        className,
      )}
    >
      <p className="text-base font-medium text-[var(--text-primary)]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load this view",
  description,
  action,
  className,
  compact = false,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
  compact?: boolean | undefined;
}) {
  return (
    <div
      className={clsx(
        "rounded-[24px] border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)]",
        compact ? "px-4 py-3" : "p-6",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[var(--feedback-danger)]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--feedback-danger)]/90">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string | undefined }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-full bg-[var(--bg-sunken)] before:absolute before:inset-y-[-40%] before:left-[-30%] before:w-1/3 before:rotate-12 before:bg-[var(--border)] before:content-[''] before:animate-[zook-shimmer_1200ms_linear_infinite]",
        className,
      )}
    />
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

export type DataTableColumn<Row> = {
  id: string;
  header: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  render: (row: Row) => React.ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <motion.div
      variants={fadeUpVariants}
      className={clsx(
        "relative overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      aria-label="Scrollable table"
    >
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-[var(--bg-sunken)] text-[var(--text-tertiary)]">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={clsx(
                  "px-4 py-3 font-medium",
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                      ? "text-center"
                      : "text-left",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)} className="align-top transition-colors duration-200 hover:bg-[var(--bg-sunken)]">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx(
                      "min-w-0 break-words px-4 py-3 text-[var(--text-secondary)]",
                      column.align === "right"
                        ? "text-right"
                        : column.align === "center"
                          ? "text-center"
                          : "text-left",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-5 text-[var(--text-tertiary)]" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </motion.div>
  );
}

export function VirtualizedDataTable<Row>({
  columns,
  rows,
  rowKey,
  empty,
  className,
  rowHeight = 88,
  maxHeight = 560,
  overscan = 6,
  gridTemplateColumns,
  tableMinWidth = "720px",
}: {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  empty: React.ReactNode;
  className?: string | undefined;
  rowHeight?: number | undefined;
  maxHeight?: number | undefined;
  overscan?: number | undefined;
  gridTemplateColumns?: string | undefined;
  tableMinWidth?: string | undefined;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ height: maxHeight, top: 0 });
  const totalHeight = rows.length * rowHeight;
  const bodyHeight = rows.length ? Math.min(maxHeight, totalHeight) : undefined;
  const template = gridTemplateColumns ?? `repeat(${columns.length}, minmax(120px, 1fr))`;
  const visibleRange = useMemo(() => {
    if (!rows.length) {
      return { start: 0, end: 0 };
    }
    const visibleStart = Math.floor(viewport.top / rowHeight);
    const visibleEnd = Math.ceil((viewport.top + viewport.height) / rowHeight);
    return {
      start: Math.max(0, visibleStart - overscan),
      end: Math.min(rows.length, visibleEnd + overscan),
    };
  }, [overscan, rowHeight, rows.length, viewport.height, viewport.top]);
  const visibleRows = rows.slice(visibleRange.start, visibleRange.end);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const syncViewport = () => {
      setViewport({ height: node.clientHeight || maxHeight, top: node.scrollTop });
    };
    syncViewport();
    node.addEventListener("scroll", syncViewport, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncViewport);
      resizeObserver.observe(node);
    }

    return () => {
      node.removeEventListener("scroll", syncViewport);
      resizeObserver?.disconnect();
    };
  }, [maxHeight]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = 0;
      setViewport({ height: node.clientHeight || maxHeight, top: 0 });
    }
  }, [maxHeight, rows]);

  return (
    <motion.div
      variants={fadeUpVariants}
      className={clsx(
        "relative overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)]",
        className,
      )}
      aria-label="Virtualized scrollable table"
    >
      <div style={{ minWidth: tableMinWidth }}>
        <div
          className="grid border-b border-[var(--border)] bg-[var(--bg-sunken)] text-sm text-[var(--text-tertiary)]"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              role="columnheader"
              className={clsx(
                "px-4 py-3 font-medium",
                column.align === "right"
                  ? "text-right"
                  : column.align === "center"
                    ? "text-center"
                    : "text-left",
                column.className,
              )}
            >
              {column.header}
            </div>
          ))}
        </div>

        {rows.length ? (
          <div
            ref={scrollRef}
            className="relative overflow-y-auto"
            style={{ height: bodyHeight, maxHeight }}
            role="rowgroup"
          >
            <div style={{ height: totalHeight, position: "relative" }}>
              {visibleRows.map((row, index) => {
                const rowIndex = visibleRange.start + index;
                return (
                  <div
                    key={rowKey(row)}
                    role="row"
                    className="absolute left-0 right-0 grid border-b border-[var(--border-subtle)] text-sm transition-colors duration-200 hover:bg-[var(--bg-sunken)]"
                    style={{
                      gridTemplateColumns: template,
                      minHeight: rowHeight,
                      transform: `translateY(${rowIndex * rowHeight}px)`,
                    }}
                  >
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        role="cell"
                        className={clsx(
                          "min-w-0 self-center break-words px-4 py-3 text-[var(--text-secondary)]",
                          column.align === "right"
                            ? "text-right"
                            : column.align === "center"
                              ? "text-center"
                              : "text-left",
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 text-sm text-[var(--text-tertiary)]">{empty}</div>
        )}
      </div>
    </motion.div>
  );
}

export function StatusPill({
  value,
  tone,
  className,
}: {
  value: string;
  tone?: PillTone;
  className?: string | undefined;
}) {
  const resolvedTone = tone ?? toneFromStatus(value);
  const Icon =
    resolvedTone === "lime"
      ? Check
      : resolvedTone === "amber"
        ? AlertTriangle
        : resolvedTone === "red"
          ? X
          : Circle;
  return (
    <Pill
      tone={resolvedTone}
      aria-label={`Status: ${value}`}
      {...(className ? { className } : {})}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {value}
    </Pill>
  );
}

const inputClass =
  "zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] disabled:opacity-50";

export function TextInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={clsx("grid gap-2 text-sm text-[var(--text-secondary)]", className)}>
      {label}
      <input {...props} className={inputClass} />
    </label>
  );
}

export function DatePicker({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <TextInput {...props} type="date" label={label} className={className} />;
}

export function MoneyInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <TextInput {...props} inputMode="decimal" label={label} className={className} />;
}

export function SelectInput({
  label,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={clsx("grid gap-2 text-sm text-[var(--text-secondary)]", className)}>
      {label}
      <select
        {...props}
        className={clsx(
          "zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50",
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "zook-focus inline-flex min-h-11 items-center justify-between gap-4 rounded-full border px-4 text-sm font-semibold transition disabled:opacity-50",
        checked
          ? "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
          : "border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-secondary)]",
      )}
    >
      {label}
      <span
        className={clsx(
          "h-5 w-9 rounded-full border p-0.5 transition",
          checked ? "border-[var(--border-focus)] bg-[var(--accent-fill)]" : "border-[var(--border)] bg-[var(--surface-raised)]",
        )}
      >
        <span
          className={clsx(
            "block h-3.5 w-3.5 rounded-full transition",
            checked ? "translate-x-4 bg-[var(--text-on-accent)]" : "translate-x-0 bg-[var(--text-tertiary)]",
          )}
        />
      </span>
    </button>
  );
}

export function TableLoader({ label = "Rows are loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="grid grid-cols-[1.2fr_0.9fr_0.8fr] gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]/30 p-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)]/95 p-4 shadow-[var(--shadow-lg)]">
      <p className="font-semibold text-[var(--text-primary)]">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="zook-focus rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="zook-focus rounded-full bg-[var(--accent-fill)] px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)]">
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
