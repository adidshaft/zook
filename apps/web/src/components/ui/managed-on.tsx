import clsx from "clsx";
import { MonitorSmartphone } from "lucide-react";
import React, { type ReactNode } from "react";

export type ManagedSurface =
  | "desk"
  | "trainer-mobile"
  | "member-mobile"
  | "reception-mobile"
  | "owner-mobile"
  | "platform";

const surfaceCopy: Record<ManagedSurface, { label: string; tone: string }> = {
  desk: { label: "Managed at Desk", tone: "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:border-sky-300/25 dark:bg-sky-300/10 dark:text-sky-200" },
  "trainer-mobile": {
    label: "Trainer app",
    tone: "border-lime-600/30 bg-lime-500/10 text-lime-800 dark:border-lime-300/25 dark:bg-lime-300/10 dark:text-lime-200",
  },
  "member-mobile": {
    label: "Member app",
    tone: "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-200",
  },
  "reception-mobile": {
    label: "Reception app",
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  },
  "owner-mobile": {
    label: "Owner app",
    tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-200",
  },
  platform: {
    label: "Platform",
    tone: "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]",
  },
};

export function managedOnLabel(surface: ManagedSurface) {
  return surfaceCopy[surface].label;
}

export function ManagedOn({
  surface,
  children,
  href,
  className,
}: {
  surface: ManagedSurface;
  children: ReactNode;
  href?: string | undefined;
  className?: string | undefined;
}) {
  const copy = surfaceCopy[surface];
  const content = (
    <>
      <span
        className={clsx(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
          copy.tone,
        )}
      >
        <MonitorSmartphone className="h-3.5 w-3.5" aria-hidden="true" />
        {copy.label}
      </span>
      <span className="text-sm leading-5 text-[var(--text-secondary)]">{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={clsx(
          "zook-focus flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3 transition hover:bg-[var(--bg-sunken)]/60 shadow-sm",
          className,
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-col items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] p-3 shadow-sm",
        className,
      )}
    >
      {content}
    </div>
  );
}
