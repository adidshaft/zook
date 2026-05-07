"use client";

import clsx from "clsx";
import { Info, X } from "lucide-react";
import React, { useId, useState, type ReactNode } from "react";

export function helpHintLabel(label?: string) {
  return label ? `Help: ${label}` : "Open help";
}

export function HelpHint({
  label,
  title,
  children,
  href,
  hrefLabel = "Read more",
  size = "sm",
  align = "end",
  className,
}: {
  label?: string | undefined;
  title?: string | undefined;
  children: ReactNode;
  href?: string | undefined;
  hrefLabel?: string | undefined;
  size?: "xs" | "sm" | undefined;
  align?: "start" | "end" | undefined;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonSize = size === "xs" ? "h-7 w-7" : "h-8 w-8";

  return (
    <span className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={helpHintLabel(label)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={clsx(
          "zook-focus inline-grid shrink-0 place-items-center rounded-full border border-white/12 bg-white/6 text-white/58 transition hover:bg-white/12 hover:text-white",
          buttonSize,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open ? (
        <span
          id={id}
          role="dialog"
          aria-label={title ?? label ?? "Help"}
          className={clsx(
            "absolute top-full z-[160] mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/12 bg-zinc-950/98 p-4 text-left shadow-2xl shadow-black/55 backdrop-blur",
            align === "start" ? "left-0" : "right-0",
          )}
        >
          <span className="flex items-start justify-between gap-3">
            {title ? <span className="text-sm font-semibold text-white">{title}</span> : <span />}
            <button
              type="button"
              aria-label="Close help"
              onClick={() => setOpen(false)}
              className="zook-focus -mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/45 hover:bg-white/8 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
          <span className="mt-2 block text-sm leading-6 text-white/62">{children}</span>
          {href ? (
            <a
              href={href}
              className="zook-focus mt-3 inline-flex rounded-full text-xs font-semibold text-lime-100 underline-offset-4 hover:underline"
            >
              {hrefLabel}
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
