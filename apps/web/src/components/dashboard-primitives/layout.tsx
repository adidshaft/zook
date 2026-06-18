"use client";

import clsx from "clsx";
import { motion, type Variants } from "framer-motion";
import { Check, AlertTriangle, X, Circle } from "lucide-react";
import { Pill, ProductPanel, type PillTone } from "../glass-card";
import { toneFromStatus } from "./stats";

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
          {badge}
        </div>
        {description ? (
          <div className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
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
    <ProductPanel className={className}>
      <motion.div
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
      </motion.div>
    </ProductPanel>
  );
}

export function StatusDot({
  tone = "neutral",
}: {
  tone?: PillTone;
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
