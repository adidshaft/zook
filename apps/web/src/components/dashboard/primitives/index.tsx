"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import {
  ConfirmDialog,
  DataTable,
  DatePicker,
  EmptyState,
  ErrorState,
  MetricCard,
  MoneyInput,
  ReadoutGrid,
  SectionHeader,
  SelectInput,
  Skeleton,
  StatusPill,
  TableLoader,
  ToggleSwitch,
  toneFromSeverity,
  toneFromStatus,
  type DataTableColumn,
} from "../../dashboard-primitives";
import { GlassCard } from "../../glass-card";

type SelectOption = {
  value: string;
  label: ReactNode;
};

export function Section({
  eyebrow,
  title,
  description,
  action,
  badge,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headerProps = {
    title,
    ...(eyebrow ? { eyebrow } : {}),
    ...(description ? { description } : {}),
    ...(badge ? { badge } : {}),
    ...(action ? { action } : {}),
  };

  return (
    <GlassCard className={className}>
      <SectionHeader {...headerProps} />
      <div className="mt-5">{children}</div>
    </GlassCard>
  );
}

export function Select({
  label,
  options,
  className,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  options: SelectOption[];
}) {
  return (
    <SelectInput label={label} className={className} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-black">
          {option.label}
        </option>
      ))}
    </SelectInput>
  );
}

export function TextInput({
  label,
  hint,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <label className={clsx("grid gap-2 text-sm text-[var(--text-secondary)]", className)}>
      {label}
      <input
        {...props}
        className={clsx(
          "zook-focus min-h-11 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] disabled:opacity-50",
          error ? "border-[var(--feedback-danger)]" : undefined,
        )}
      />
      {error ? <span className="text-xs text-[var(--feedback-danger)]">{error}</span> : null}
      {hint && !error ? <span className="text-xs text-[var(--text-tertiary)]">{hint}</span> : null}
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <ToggleSwitch
      label={label}
      checked={checked}
      onChange={onCheckedChange}
      {...(disabled === undefined ? {} : { disabled })}
    />
  );
}

export {
  ConfirmDialog,
  DataTable,
  DatePicker,
  EmptyState,
  ErrorState,
  MetricCard,
  MoneyInput,
  ReadoutGrid,
  SectionHeader,
  SelectInput,
  Skeleton,
  StatusPill,
  TableLoader,
  ToggleSwitch,
  toneFromSeverity,
  toneFromStatus,
  type DataTableColumn,
};
