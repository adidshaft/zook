"use client";

import { useOperationalResource } from "@/lib/use-operational-resource";

export function DeskPendingBadge({
  orgId,
  branchId,
  active,
}: {
  orgId: string;
  branchId: string | null;
  active: boolean;
}) {
  const pendingState = useOperationalResource<{ records: unknown[] }>({
    path: branchId
      ? `/api/orgs/${orgId}/attendance/live?branchId=${encodeURIComponent(branchId)}`
      : `/api/orgs/${orgId}/attendance/live`,
    refreshMs: 15_000,
  });
  const pendingCount = pendingState.data?.records.length ?? 0;

  if (pendingCount <= 0) {
    return null;
  }

  return (
    <span
      className={`grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold ${
        active
          ? "bg-black/10 text-[var(--text-on-accent)] dark:bg-white/20"
          : "border border-[var(--border)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]"
      }`}
    >
      {pendingCount}
    </span>
  );
}
