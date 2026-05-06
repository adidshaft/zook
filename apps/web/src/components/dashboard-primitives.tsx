import clsx from "clsx";
import { GlassCard, Pill, type PillTone } from "./glass-card";

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
    <div
      className={clsx("flex flex-col justify-between gap-4 md:flex-row md:items-start", className)}
    >
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/35">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h2>
          {badge}
        </div>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/52">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
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
    neutral: "from-white/10 via-white/4 to-transparent",
    lime: "from-lime-300/20 via-lime-300/6 to-transparent",
    amber: "from-amber-300/18 via-amber-300/6 to-transparent",
    red: "from-red-300/18 via-red-300/6 to-transparent",
    blue: "from-sky-300/18 via-sky-300/6 to-transparent",
  };

  return (
    <GlassCard variant="strong" className={clsx("relative overflow-hidden", className)}>
      <div className={clsx("absolute inset-0 bg-gradient-to-br", accents[tone])} />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/48">{label}</p>
          {icon ? <div className="text-white/55">{icon}</div> : null}
        </div>
        <div className="metric mt-4 text-4xl font-semibold text-white">{value}</div>
        {delta ? <p className="mt-3 text-xs leading-5 text-white/55">{delta}</p> : null}
      </div>
    </GlassCard>
  );
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
        "rounded-[24px] border border-dashed border-white/12 bg-black/20 p-6",
        className,
      )}
    >
      <p className="text-base font-medium text-white">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/48">{description}</p>
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
        "rounded-[24px] border border-[rgba(255,90,61,0.24)] bg-[rgba(255,90,61,0.1)]",
        compact ? "px-4 py-3" : "p-6",
        className,
      )}
    >
      <p className="text-sm font-semibold text-[#ffc9bc]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#ffc9bc]/75">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string | undefined }) {
  return <div className={clsx("animate-pulse rounded-full bg-white/10", className)} />;
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
          className="min-w-0 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3"
        >
          <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
            {item.label}
          </dt>
          <dd className="mt-2 min-w-0 break-words text-lg font-semibold text-white">
            {item.value}
          </dd>
          {item.meta ? (
            <p className="mt-1 min-w-0 break-words text-xs leading-5 text-white/45">{item.meta}</p>
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
    <div
      className={clsx(
        "overflow-x-auto rounded-[24px] border border-white/10 bg-black/25",
        className,
      )}
    >
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-white/6 text-white/42">
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
        <tbody className="divide-y divide-white/10">
          {rows.length ? (
            rows.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={clsx(
                      "min-w-0 break-words px-4 py-3 text-white/72",
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
              <td className="px-4 py-5 text-white/45" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
  return (
    <Pill tone={tone ?? toneFromStatus(value)} {...(className ? { className } : {})}>
      {value}
    </Pill>
  );
}

const inputClass =
  "zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/35 disabled:opacity-50";

export function TextInput({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={clsx("grid gap-2 text-sm text-white/62", className)}>
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
    <label className={clsx("grid gap-2 text-sm text-white/62", className)}>
      {label}
      <select
        {...props}
        className={clsx(
          "zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white disabled:opacity-50",
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
          ? "border-lime-300/50 bg-lime-300/15 text-lime-50"
          : "border-white/10 bg-black/30 text-white/62",
      )}
    >
      {label}
      <span
        className={clsx(
          "h-5 w-9 rounded-full border p-0.5 transition",
          checked ? "border-lime-300 bg-lime-300/40" : "border-white/15 bg-white/8",
        )}
      >
        <span
          className={clsx(
            "block h-3.5 w-3.5 rounded-full bg-white transition",
            checked ? "translate-x-4 bg-lime-100" : "translate-x-0 bg-white/55",
          )}
        />
      </span>
    </button>
  );
}

export function TableLoader({ label = "Loading..." }: { label?: string }) {
  return <EmptyState title={label} description="Fresh data is loading now." />;
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
    <div className="rounded-[24px] border border-white/10 bg-black/55 p-4 shadow-2xl">
      <p className="font-semibold text-white">{title}</p>
      {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="zook-focus rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="zook-focus rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-black">
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
