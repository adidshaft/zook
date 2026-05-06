type BranchLike =
  | {
      name?: string | null;
    }
  | null
  | undefined;

export function formatBranchName(branch: BranchLike, fallback = "Main branch"): string {
  const name = branch?.name?.trim();
  if (!name || name === "Default Branch" || name === "Default Branch missing") {
    return fallback;
  }
  return name;
}
