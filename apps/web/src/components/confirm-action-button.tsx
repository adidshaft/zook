"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useCallback, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ZookButton } from "@/components/zook-button";
import { useModalFocusTrap } from "@/components/ui/use-modal-focus-trap";

type ConfirmActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "lime" | "danger";
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
};

export function ConfirmActionButton({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmTone,
  onConfirm,
  children,
  className,
  disabled,
  type = "button",
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useModalFocusTrap<HTMLDivElement>({
    open,
    onClose: () => {
      if (!confirming) {
        setOpen(false);
      }
    },
  });

  const closeDialog = useCallback(() => {
    if (!confirming) {
      setOpen(false);
    }
  }, [confirming]);
  const resolvedConfirmTone =
    confirmTone ??
    (buttonProps["aria-label"]?.toString().toLowerCase().includes("delete") ||
    confirmLabel.toLowerCase().includes("delete")
      ? "danger"
      : "lime");

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
    <span className="inline-flex">
      <button
        {...buttonProps}
        type={type}
        disabled={disabled || confirming}
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  closeDialog();
                }
              }}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className="w-full max-w-sm rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)]/98 p-4 shadow-[var(--shadow-lg)]"
              >
                <p id={titleId} className="text-sm font-semibold text-[var(--text-primary)]">
                  {title}
                </p>
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-1 text-sm leading-6 text-[var(--text-secondary)]"
                  >
                    {description}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <ZookButton
                    type="button"
                    data-testid="cancel"
                    tone="ghost"
                    size="sm"
                    onClick={closeDialog}
                    disabled={confirming}
                  >
                    {cancelLabel}
                  </ZookButton>
                  <ZookButton
                    type="button"
                    data-testid="confirm"
                    tone={resolvedConfirmTone}
                    size="sm"
                    onClick={() => void runConfirmation()}
                    state={confirming ? "loading" : "idle"}
                  >
                    {confirming ? "Working..." : confirmLabel}
                  </ZookButton>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
