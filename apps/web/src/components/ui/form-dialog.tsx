"use client";

import { ActionModal } from "./action-modal";

type FormDialogFieldBase = {
  name: string;
  label: string;
  value: string;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  onChange: (value: string) => void;
};

export type FormDialogField =
  | (FormDialogFieldBase & {
      type: "text" | "number";
      inputMode?: "decimal" | "numeric" | "text" | undefined;
    })
  | (FormDialogFieldBase & {
      type: "textarea";
      rows?: number | undefined;
    })
  | (FormDialogFieldBase & {
      type: "select";
      options: Array<{ label: string; value: string }>;
    })
  | (FormDialogFieldBase & {
      type: "file";
      accept?: string | undefined;
      onFileChange?: (file: File | null) => void;
    });

const inputClass =
  "min-h-10 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-white/25";

function fieldClass(field: FormDialogField, extra = "") {
  return [inputClass, extra, field.className].filter(Boolean).join(" ");
}

export function FormDialog({
  open,
  eyebrow,
  title,
  subtitle,
  danger,
  busy,
  submitLabel,
  fields,
  onClose,
  onSubmit,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string | undefined;
  danger?: boolean | undefined;
  busy?: boolean | undefined;
  submitLabel?: string | undefined;
  fields: FormDialogField[];
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ActionModal
      open={open}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      danger={danger}
      busy={busy}
      submitLabel={submitLabel}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      {fields.map((field) => (
        <label key={field.name} className="grid gap-2 text-sm text-white/70">
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              className={fieldClass(field, field.rows && field.rows > 3 ? "min-h-32 py-3" : "min-h-24 py-3")}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={field.rows}
            />
          ) : field.type === "select" ? (
            <select
              className={fieldClass(field)}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              required={field.required}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "file" ? (
            <input
              className={fieldClass(field)}
              type="file"
              accept={field.accept}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                field.onFileChange?.(file);
                field.onChange(file?.name ?? "");
              }}
              required={field.required}
            />
          ) : (
            <input
              className={fieldClass(field)}
              type={field.type === "number" ? "text" : "text"}
              inputMode={field.inputMode ?? (field.type === "number" ? "decimal" : undefined)}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}
        </label>
      ))}
    </ActionModal>
  );
}
