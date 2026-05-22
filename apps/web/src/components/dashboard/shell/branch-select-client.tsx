"use client";

import { useRouter } from "next/navigation";
import { SearchableSelect, type SearchableSelectOption } from "../../ui";
import { useT } from "@/lib/use-t";

export function BranchSelectClient({
  options,
  selectedBranchId,
}: {
  options: Array<SearchableSelectOption & { href: string }>;
  selectedBranchId?: string | undefined;
}) {
  const router = useRouter();
  const t = useT("webUx.branchSwitcher");

  return (
    <div className="w-full min-w-0 max-w-[15rem] min-[320px]:max-w-[17rem]">
      <SearchableSelect
        label={t("label")}
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
        buttonClassName="zook-focus flex min-h-10 min-w-0 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)]/60 disabled:opacity-50"
      />
    </div>
  );
}
