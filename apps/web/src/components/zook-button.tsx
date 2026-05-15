"use client";

import Link from "next/link";
import clsx from "clsx";
import { motion } from "framer-motion";

const MotionLink = motion.create(Link);

type ZookButtonTone = "lime" | "secondary" | "ghost" | "danger";
type ZookButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ZookButtonState = "idle" | "loading" | "success";

const toneClasses: Record<ZookButtonTone, string> = {
  lime: "zook-button-lime border-lime-300 bg-lime-300 text-black shadow-[var(--zook-shadow-glow-lime)] hover:bg-lime-200 active:bg-lime-300",
  secondary:
    "border-white/14 bg-white/[0.06] text-white hover:bg-white/[0.1] active:bg-white/[0.08]",
  ghost:
    "border-white/10 bg-transparent text-white/72 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.06]",
  danger:
    "border-[rgba(255,90,61,0.35)] bg-[rgba(255,90,61,0.12)] text-white hover:bg-[rgba(255,90,61,0.18)] active:bg-[rgba(255,90,61,0.14)]",
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
