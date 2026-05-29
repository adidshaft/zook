"use client";

import clsx from "clsx";

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
