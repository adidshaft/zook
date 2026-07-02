"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchableSelect, type SearchableSelectOption } from "../../ui";

export type GymSelectOption = SearchableSelectOption & { href: string; logoUrl?: string | null };

function gymInitials(name?: string) {
  const parts = (name ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "G";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function GymBrandMark({ option }: { option?: GymSelectOption | undefined }) {
  const baseClass =
    "grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[12px] font-black text-[var(--accent-strong)]";

  if (option?.logoUrl) {
    return (
      <span className={baseClass}>
        <img
          src={option.logoUrl}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  if (option?.label) {
    return <span className={baseClass}>{gymInitials(option.label)}</span>;
  }

  return (
    <span className={baseClass}>
      <Building2 className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

export function GymSelectClient({
  options,
  activeOrgId,
  labels,
}: {
  options: GymSelectOption[];
  activeOrgId: string;
  labels: {
    label: string;
    placeholder: string;
    search: string;
    empty: string;
    workspace: string;
    subscriptionScope?: string | undefined;
    enrolledGymCount?: string | undefined;
    enrolledGymCountSingular?: string | undefined;
  };
}) {
  const router = useRouter();
  const selectedOption = options.find((option) => option.value === activeOrgId);
  const singleGym = options.length <= 1;
  const countTemplate =
    options.length === 1
      ? (labels.enrolledGymCountSingular ?? labels.enrolledGymCount)
      : labels.enrolledGymCount;
  const enrolledGymCount =
    countTemplate?.replace("{count}", String(options.length)) ??
    `${options.length} ${options.length === 1 ? "gym" : "gyms"}`;
  const metaLine = [selectedOption?.description, labels.subscriptionScope].filter(Boolean).join(" · ");
  const selectedContent = (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <GymBrandMark option={selectedOption} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2 text-[10px] font-semibold uppercase leading-3 tracking-[0.12em] text-[var(--text-tertiary)]">
          <span className="shrink-0">{labels.workspace}</span>
          <span className="shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sunken)] px-1.5 py-0.5 text-[9px] font-bold leading-3 tracking-normal text-[var(--text-tertiary)]">
            {enrolledGymCount}
          </span>
        </span>
        <span className="mt-0.5 block max-w-[24rem] whitespace-normal break-words text-[15px] font-bold leading-5 text-[var(--text-primary)]">
          {selectedOption?.label ?? labels.placeholder}
        </span>
        {metaLine ? (
          <span className="mt-0.5 block truncate text-[11px] font-medium leading-3 text-[var(--text-tertiary)]">
            {metaLine}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (singleGym) {
    return (
      <div
        aria-label={labels.label}
        className="flex min-h-12 min-w-0 w-full items-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-left text-sm text-[var(--text-secondary)]"
      >
        {selectedContent}
      </div>
    );
  }

  return (
    <SearchableSelect
      label={labels.label}
      placeholder={labels.placeholder}
      searchPlaceholder={labels.search}
      emptyLabel={labels.empty}
      options={options}
      value={activeOrgId}
      onChange={(orgId) => {
        const next = options.find((option) => option.value === orgId);
        if (next) {
          router.push(next.href);
        }
      }}
      hideLabel
      buttonClassName="zook-focus flex min-h-12 min-w-0 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]/60 disabled:cursor-default disabled:opacity-100"
      buttonContent={selectedContent}
    />
  );
}
