import Link from "next/link";
import type { DashboardCopy, DashboardData } from "./types";

function prioritizeBranches(
  branches: DashboardData["branchScope"]["branches"],
  selectedBranchId?: string,
  limit = 4,
) {
  const priorityIds = new Set<string>();
  if (selectedBranchId) {
    priorityIds.add(selectedBranchId);
  }
  const defaultBranch = branches.find((branch) => branch.isDefault);
  if (defaultBranch) {
    priorityIds.add(defaultBranch.id);
  }

  const priorityBranches = branches.filter((branch) => priorityIds.has(branch.id));
  const remainingBranches = branches.filter((branch) => !priorityIds.has(branch.id));
  const visible = [...priorityBranches, ...remainingBranches].slice(0, limit);
  const visibleIds = new Set(visible.map((branch) => branch.id));

  return {
    visible,
    overflow: branches.filter((branch) => !visibleIds.has(branch.id)),
  };
}

export function BranchSwitcher({
  branches,
  selectedBranchId,
  branchHref,
  copy,
  compact = false,
}: {
  branches: DashboardData["branchScope"]["branches"];
  selectedBranchId: string | undefined;
  branchHref: (branchId: string) => string;
  copy: DashboardCopy;
  compact?: boolean;
}) {
  const { visible, overflow } = prioritizeBranches(branches, selectedBranchId, compact ? 3 : 4);
  const linkClass = (branchId: string) =>
    `rounded-full border px-3 py-1.5 text-xs transition ${
      selectedBranchId === branchId
        ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
        : "border-white/10 text-white/55 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <div className="flex max-w-full flex-wrap gap-2 pb-1">
      {visible.map((branch) => (
        <Link key={branch.id} href={branchHref(branch.id)} className={`${linkClass(branch.id)} shrink-0`}>
          {branch.name}
        </Link>
      ))}
      {overflow.length > 0 ? (
        <details className="group relative z-[110] shrink-0">
          <summary className="cursor-pointer list-none rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55 transition hover:bg-white/8 hover:text-white [&::-webkit-details-marker]:hidden">
            +{overflow.length} {copy.common.moreBranches}
          </summary>
          <div className="absolute left-0 z-[120] mt-2 grid max-h-64 min-w-60 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50 backdrop-blur">
            {overflow.map((branch) => (
              <Link key={branch.id} href={branchHref(branch.id)} className={`${linkClass(branch.id)} shrink-0`}>
                {branch.name}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
