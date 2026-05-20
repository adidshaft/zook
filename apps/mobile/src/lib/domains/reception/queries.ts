import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { ReceptionQueueRecord } from "@/lib/domains/shared/types";

export function useReceptionQueue(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.reception.queue(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<{ records: ReceptionQueueRecord[] }>(
        `/orgs/${resolvedOrgId}/attendance/live`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 20_000,
  });
}
