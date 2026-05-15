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
    <label className={clsx("grid gap-2 text-sm text-white/62", className)}>
      {label}
      <input
        {...props}
        className={clsx(
          "zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white placeholder:text-white/35 disabled:opacity-50",
          error ? "border-red-300/35" : undefined,
        )}
      />
      {error ? <span className="text-xs text-red-200">{error}</span> : null}
      {hint && !error ? <span className="text-xs text-white/42">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
}) {
  return (
    <label className={clsx("grid gap-2 text-sm text-white/62", className)}>
      {label}
      <textarea
        {...props}
        className={clsx(
          "zook-focus min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 disabled:opacity-50",
        )}
      />
      {error ? <span className="text-xs text-red-200">{error}</span> : null}
      {hint && !error ? <span className="text-xs text-white/42">{hint}</span> : null}
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
