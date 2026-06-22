import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { ReceptionQueueRecord } from "@/lib/domains/shared/types";

export function useOrgAttendanceToday(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.attendance.today(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/today`,
        { token, orgId: resolvedOrgId, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 30_000,
  });
}

export function useOrgAttendancePending(orgId?: string, options?: { enabled?: boolean }) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.attendance.pending(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/pending`,
        { token, orgId: resolvedOrgId, ...(selectedBranchId ? { branchId: selectedBranchId } : {}) },
      ),
    enabled:
      options?.enabled !== false &&
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId),
    refetchInterval: 20_000,
  });
}
