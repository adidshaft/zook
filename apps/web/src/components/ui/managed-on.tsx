import clsx from "clsx";
import React, { type ReactNode } from "react";

export type ManagedSurface =
  | "desk"
  | "trainer-mobile"
  | "member-mobile"
  | "reception-mobile"
  | "owner-mobile"
  | "platform";

const surfaceCopy: Record<ManagedSurface, { label: string; tone: string }> = {
  desk: { label: "Desk", tone: "text-sky-700 dark:text-sky-200" },
  "trainer-mobile": {
    label: "Trainer app",
    tone: "text-lime-700 dark:text-lime-200",
  },
  "member-mobile": {
    label: "Member app",
    tone: "text-violet-700 dark:text-violet-200",
  },
  "reception-mobile": {
    label: "Reception app",
    tone: "text-amber-700 dark:text-amber-200",
  },
  "owner-mobile": {
    label: "Owner app",
    tone: "text-cyan-700 dark:text-cyan-200",
  },
  platform: {
    label: "Platform",
    tone: "text-[var(--text-secondary)]",
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
          "shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em]",
          copy.tone,
        )}
      >
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
          "zook-focus flex flex-col items-start gap-1.5 border-l border-[var(--border)] pl-3 transition hover:border-[var(--border-strong)]",
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
        "flex flex-col items-start gap-1.5 border-l border-[var(--border)] pl-3",
        className,
      )}
    >
      {content}
    </div>
  );
}
