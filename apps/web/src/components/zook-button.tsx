"use client";

import Link from "next/link";
import clsx from "clsx";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

type ZookButtonTone = "lime" | "secondary" | "ghost" | "danger";
type ZookButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ZookButtonState = "idle" | "loading" | "success";

const toneClasses: Record<ZookButtonTone, string> = {
  lime: "zook-button-lime border-[var(--accent-fill)] bg-[var(--accent-fill)] text-[var(--text-on-accent)] hover:bg-[var(--accent-soft)] active:bg-[var(--accent-fill)]",
  secondary:
    "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] active:bg-[var(--surface)]",
  ghost:
    "border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] active:bg-[var(--surface-raised)]",
  danger:
    "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)] hover:bg-[color-mix(in_srgb,var(--feedback-danger)_18%,var(--surface-danger-soft))] active:bg-[var(--surface-danger-soft)]",
};

const baseClasses =
  "zook-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

type ButtonLikeProps = {
  children: React.ReactNode;
  tone?: ZookButtonTone;
  variant?: ZookButtonVariant;
  state?: ZookButtonState;
  size?: "sm" | "md";
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  className?: string;
};

function buttonClasses({
  tone,
  variant,
  size,
  fullWidth,
  className,
}: {
  tone?: ZookButtonTone;
  variant?: ZookButtonVariant | undefined;
  size: "sm" | "md";
  fullWidth?: boolean;
  className?: string | undefined;
}) {
  const resolvedTone = tone ?? (variant === "primary" ? "lime" : variant ?? "lime");
  return clsx(
    baseClasses,
    toneClasses[resolvedTone],
    size === "sm" ? "min-h-9 px-4 py-2 text-xs" : null,
    fullWidth ? "w-full" : null,
    className,
  );
}

export function ZookButton({
  children,
  tone = "lime",
  variant,
  state = "idle",
  size = "md",
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  ...props
}: ButtonLikeProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      {...(props as any)}
      disabled={props.disabled || state === "loading"}
      aria-busy={state === "loading" ? true : undefined}
      whileHover={props.disabled || state === "loading" ? {} : { scale: 1.02 }}
      whileTap={props.disabled || state === "loading" ? {} : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={buttonClasses({ tone, variant, size, fullWidth, className })}
    >
      {state === "loading" ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> : leadingIcon}
      {state === "success" ? <span aria-hidden="true">✓</span> : null}
      {children}
      {trailingIcon}
    </motion.button>
  );
}

export function ZookButtonLink({
  children,
  tone = "lime",
  variant,
  state = "idle",
  size = "md",
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  ...props
}: ButtonLikeProps & React.ComponentProps<typeof Link>) {
  return (
    <MotionLink
      {...(props as any)}
      aria-busy={state === "loading" ? true : undefined}
      whileHover={state === "loading" ? {} : { scale: 1.02 }}
      whileTap={state === "loading" ? {} : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={buttonClasses({ tone, variant, size, fullWidth, className })}
    >
      {state === "loading" ? <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" /> : leadingIcon}
      {state === "success" ? <span aria-hidden="true">✓</span> : null}
      {children}
      {trailingIcon}
    </MotionLink>
  );
}
