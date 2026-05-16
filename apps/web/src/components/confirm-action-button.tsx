"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { ZookButton } from "@/components/zook-button";

type ConfirmActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
};

export function ConfirmActionButton({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  children,
  className,
  disabled,
  type = "button",
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function runConfirmation() {
    try {
      setConfirming(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        {...buttonProps}
        type={type}
        disabled={disabled || confirming}
        onClick={() => setOpen(true)}
        className={className}
      >
        {children}
      </button>
      {open ? (
        <span className="absolute right-0 top-full z-[160] mt-2 w-[min(18rem,82vw)] rounded-[22px] border border-white/10 bg-zinc-950/96 p-3 text-left shadow-2xl shadow-black/60 backdrop-blur">
          <span className="block text-sm font-semibold text-white">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-white/55">{description}</span>
          ) : null}
          <span className="mt-3 flex flex-wrap justify-end gap-2">
            <ZookButton
              type="button"
              tone="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={confirming}
            >
              {cancelLabel}
            </ZookButton>
            <ZookButton
              type="button"
              tone={
                buttonProps["aria-label"]?.toString().toLowerCase().includes("delete") ||
                confirmLabel.toLowerCase().includes("delete")
                  ? "danger"
                  : "lime"
              }
              size="sm"
              onClick={() => void runConfirmation()}
              state={confirming ? "loading" : "idle"}
            >
              {confirming ? "Working..." : confirmLabel}
            </ZookButton>
          </span>
        </span>
      ) : null}
    </span>
  );
}
