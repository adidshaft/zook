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
    <div className="w-full min-w-0 max-w-[19rem] min-[320px]:max-w-[22rem]">
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
      />
    </div>
  );
}
