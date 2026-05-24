import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { TrainerClientRecord, TrainerPayoutRecord } from "@/lib/domains/shared/types";

export function useTrainerClients(orgId?: string, trainerUserId?: string, enabled = true) {
  const { activeOrgId, session, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  const resolvedTrainerId = trainerUserId ?? session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.clients(resolvedOrgId, resolvedTrainerId),
    queryFn: () =>
      mobileApiFetch<{ clients: TrainerClientRecord[] }>(
        `/orgs/${resolvedOrgId}/trainers/${resolvedTrainerId}/clients`,
        { token, orgId: resolvedOrgId },
      ),
    enabled:
      enabled &&
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(resolvedOrgId) &&
      Boolean(resolvedTrainerId),
  });
}

export function useTrainerPayouts(month?: string) {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.payouts(activeOrgId, trainerUserId, month),
    queryFn: () =>
      mobileApiFetch<{ payouts: TrainerPayoutRecord[] }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/payouts${
          month ? `?month=${encodeURIComponent(month)}` : ""
        }`,
        { token, orgId: activeOrgId },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}
