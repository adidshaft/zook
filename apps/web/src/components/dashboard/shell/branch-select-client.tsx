"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { SearchableSelect, type SearchableSelectOption } from "../../ui";
import { useT } from "@/lib/use-t";

export function BranchSelectClient({
  options,
  selectedBranchId,
  organizationName,
  fallbackLocation,
  allBranchesLabel,
  showOrganizationName = true,
}: {
  options: Array<SearchableSelectOption & { href: string }>;
  selectedBranchId?: string | undefined;
  organizationName: string;
  fallbackLocation?: string | undefined;
  allBranchesLabel: string;
  showOrganizationName?: boolean | undefined;
}) {
  const router = useRouter();
  const t = useT("webUx.branchSwitcher");
  const selectedOption = options.find((option) => option.value === selectedBranchId);
  const branchLabel = selectedOption?.label ?? t("placeholder");
  const branchLocation = selectedOption?.description ?? fallbackLocation;
  const isAllBranches = selectedOption?.value === "all";
  const scopeLabel = isAllBranches ? allBranchesLabel : branchLabel;

  return (
    <div className="w-full min-w-[15.5rem] max-w-[28rem]">
      <SearchableSelect
        label={t("placeholder")}
        placeholder={t("placeholder")}
        searchPlaceholder={t("search")}
        emptyLabel={t("empty")}
        options={options}
        value={selectedBranchId}
        onChange={(branchId) => {
          const next = options.find((option) => option.value === branchId);
          if (next) {
            router.push(next.href);
          }
        }}
        hideLabel
        buttonClassName="zook-focus flex min-h-12 min-w-0 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-sunken)]/60 disabled:opacity-50"
        buttonContent={
          <span className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] text-[var(--text-tertiary)]">
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-semibold uppercase leading-3 tracking-[0.14em] text-[var(--text-tertiary)]">
                {showOrganizationName ? t("label") : organizationName}
              </span>
              <span className="mt-0.5 block truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">
                {scopeLabel}
              </span>
              {branchLocation ? (
                <span className="mt-0.5 block truncate text-[11px] font-medium leading-3 text-[var(--text-tertiary)]">
                  {branchLocation}
                </span>
              ) : null}
            </span>
          </span>
        }
      />
    </div>
  );
}
