import type { BranchSummary } from "./types";

export function withBranch(path: string, branch?: BranchSummary | null) {
  if (!branch?.id) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}branchId=${encodeURIComponent(branch.id)}`;
}
