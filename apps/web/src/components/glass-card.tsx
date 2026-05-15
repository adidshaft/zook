"use client";

import clsx from "clsx";
import { motion, type HTMLMotionProps } from "framer-motion";

export function GlassCard({
  children,
  className,
  variant = "default",
  ...props
}: {
  children: React.ReactNode;
  className?: string | undefined;
  variant?: "default" | "strong" | "muted" | "selected" | "success" | "warning" | "danger";
} & HTMLMotionProps<"section">) {
  const variants = {
    default: "zook-glass rounded-[28px] p-5",
    strong:
      "zook-glass-strong rounded-[28px] p-6",
    muted: "rounded-[24px] border border-white/10 bg-black/25 p-5",
    selected:
      "rounded-[28px] border border-[rgba(185,244,85,0.45)] bg-[rgba(185,244,85,0.1)] p-5 shadow-[var(--zook-shadow-glow-lime)] backdrop-blur-2xl",
    success:
      "rounded-[28px] border border-[rgba(185,244,85,0.34)] bg-[rgba(185,244,85,0.08)] p-5 shadow-[var(--zook-shadow-glow-lime)] backdrop-blur-2xl",
    warning:
      "rounded-[28px] border border-[rgba(242,201,76,0.28)] bg-[rgba(242,201,76,0.1)] p-5 shadow-[var(--zook-shadow-glass)] backdrop-blur-2xl",
    danger:
      "rounded-[28px] border border-[rgba(255,90,61,0.28)] bg-[rgba(255,90,61,0.1)] p-5 shadow-[var(--zook-shadow-glass)] backdrop-blur-2xl",
  };
  return (
    <motion.section 
      {...props} 
      className={clsx(variants[variant], className)}
      whileHover={props.whileHover ?? { scale: 1.005 }}
      transition={props.transition ?? { type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.section>
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
    neutral: "border-white/10 bg-white/8 text-white/70",
    lime: "border-lime-300/45 bg-lime-300/16 text-lime-200",
    amber: "border-[rgba(242,201,76,0.32)] bg-[rgba(242,201,76,0.12)] text-[#f8e7a0]",
    red: "border-[rgba(255,90,61,0.32)] bg-[rgba(255,90,61,0.12)] text-[#ffc9bc]",
    blue: "border-sky-300/30 bg-sky-300/12 text-sky-100",
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
  ...props
}: {
  children: React.ReactNode;
  className?: string | undefined;
} & HTMLMotionProps<"section">) {
  return (
    <motion.section
      {...props}
      className={clsx(
        "zook-glass-strong relative overflow-hidden rounded-[32px] p-5 before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-lime-200/35 before:to-transparent md:p-6",
        className,
      )}
      whileHover={props.whileHover ?? { scale: 1.005 }}
      transition={props.transition ?? { type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.section>
  );
}
