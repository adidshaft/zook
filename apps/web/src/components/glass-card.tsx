"use client";

import clsx from "clsx";

export function GlassCard({
  children,
  className,
  variant = "default",
  interactive = false,
  as: Component = "div",
  ...props
}: {
  children: React.ReactNode;
  className?: string | undefined;
  variant?: "default" | "strong" | "muted" | "selected" | "success" | "warning" | "danger";
  interactive?: boolean;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLDivElement>) {
  const variants = {
    default: "zook-glass rounded-[28px] p-5",
    strong: "zook-glass-strong rounded-[28px] p-6",
    muted: "rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-5",
    selected:
      "rounded-[28px] border border-[var(--border-focus)] bg-[var(--surface-accent-soft)] p-5 shadow-[var(--shadow-glow-accent)] backdrop-blur-2xl",
    success:
      "rounded-[28px] border border-[color-mix(in_srgb,var(--feedback-success)_42%,transparent)] bg-[var(--surface-success-soft)] p-5 shadow-[var(--shadow-glow-accent)] backdrop-blur-2xl",
    warning:
      "rounded-[28px] border border-[color-mix(in_srgb,var(--feedback-warning)_34%,transparent)] bg-[var(--surface-warning-soft)] p-5 shadow-[var(--shadow-lg)] backdrop-blur-2xl",
    danger:
      "rounded-[28px] border border-[color-mix(in_srgb,var(--feedback-danger)_34%,transparent)] bg-[var(--surface-danger-soft)] p-5 shadow-[var(--shadow-lg)] backdrop-blur-2xl",
  };
  return (
    <Component 
      {...props} 
      className={clsx(
        variants[variant], 
        "transition-all duration-150 ease-out",
        interactive && "hover:scale-[1.005] hover:shadow-[var(--shadow-lg)]",
        className
      )}
      data-interactive={interactive ? "true" : undefined}
    >
      {children}
    </Component>
  );
}

export type PillTone = "neutral" | "lime" | "amber" | "red" | "blue";

export function Pill({
  children,
  tone = "neutral",
  className,
  ...props
}: {
  children: React.ReactNode;
  tone?: PillTone;
  className?: string | undefined;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const tones = {
    neutral: "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]",
    lime: "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]",
    amber: "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]",
    red: "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]",
    blue: "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]",
  };
  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ProductPanel({
  children,
  className,
  interactive = false,
  as: Component = "div",
  ...props
}: {
  children: React.ReactNode;
  className?: string | undefined;
  interactive?: boolean;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Component
      {...props}
      className={clsx(
        "zook-glass-strong relative overflow-hidden rounded-[32px] p-5 before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--border-focus)] before:to-transparent md:p-6",
        "transition-all duration-150 ease-out",
        interactive && "hover:scale-[1.005] hover:shadow-[var(--shadow-lg)]",
        className,
      )}
      data-interactive={interactive ? "true" : undefined}
    >
      {children}
    </Component>
  );
}
