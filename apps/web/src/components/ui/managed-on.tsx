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
  desk: { label: "Managed at Desk", tone: "border-sky-300/25 bg-sky-300/10 text-sky-100" },
  "trainer-mobile": {
    label: "Trainer app",
    tone: "border-lime-300/25 bg-lime-300/10 text-lime-100",
  },
  "member-mobile": {
    label: "Member app",
    tone: "border-violet-300/25 bg-violet-300/10 text-violet-100",
  },
  "reception-mobile": {
    label: "Reception app",
    tone: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  },
  "owner-mobile": {
    label: "Owner app",
    tone: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  },
  platform: {
    label: "Platform",
    tone: "border-white/16 bg-white/8 text-white/74",
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
      <span className="text-sm leading-5 text-white/56">{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={clsx(
          "zook-focus inline-flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-black/22 px-3 py-2 transition hover:bg-white/6",
          className,
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex max-w-2xl items-center gap-2 rounded-2xl border border-white/10 bg-black/22 px-3 py-2",
        className,
      )}
    >
      {content}
    </span>
  );
}
