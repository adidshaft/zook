"use client";

import clsx from "clsx";

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
