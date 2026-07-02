"use client";

import type { ReactNode } from "react";

import { ZookButton } from "../zook-button";
import { useModalFocusTrap } from "./use-modal-focus-trap";

export function ActionModal({
  open,
  eyebrow,
  title,
  subtitle,
  danger,
  busy,
  submitLabel = "Submit",
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string | undefined;
  danger?: boolean | undefined;
  busy?: boolean | undefined;
  submitLabel?: string | undefined;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const modalRef = useModalFocusTrap<HTMLFormElement>({ open, onClose });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <form
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-modal-title"
        className="w-full max-w-xl rounded-[28px] border border-white/10 bg-zinc-950 p-5 shadow-2xl outline-none"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
              {eyebrow}
            </p>
            <h3 id="action-modal-title" className="mt-2 text-xl font-semibold text-white">
              {title}
            </h3>
            {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/60 hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-5 grid gap-4">{children}</div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <ZookButton type="button" tone="ghost" onClick={onClose}>
            Cancel
          </ZookButton>
          <ZookButton
            type="submit"
            tone={danger ? "danger" : "lime"}
            disabled={busy}
            state={busy ? "loading" : "idle"}
          >
            {busy ? "Working..." : submitLabel}
          </ZookButton>
        </div>
      </form>
    </div>
  );
}
