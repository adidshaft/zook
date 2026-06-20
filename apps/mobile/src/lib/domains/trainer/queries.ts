import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import type {
  PtPlanRecord,
  PtSubscriptionRecord,
  TrainerClientRecord,
  TrainerPayoutRecord,
} from "@/lib/domains/shared/types";

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

export function useTrainerPtPlans() {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.ptPlans(activeOrgId, trainerUserId),
    queryFn: () =>
      mobileApiFetch<{ plans: PtPlanRecord[] }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/pt-plans`,
        { token, orgId: activeOrgId },
      ),
    enabled:
      status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}

export function useTrainerPtSubscriptions() {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.ptSubscriptions(activeOrgId, trainerUserId),
    queryFn: () =>
      mobileApiFetch<{ subscriptions: PtSubscriptionRecord[] }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/pt-subscriptions`,
        { token, orgId: activeOrgId },
      ),
    enabled:
      status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}

export type CreatePtPlanInput = {
  name: string;
  description?: string;
  sessionCount?: number;
  durationDays?: number;
  pricePaise: number;
};

export function useCreatePtPlan() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: CreatePtPlanInput) =>
      mobileApiFetch<{ plan: PtPlanRecord }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/pt-plans`,
        {
          method: "POST",
          token,
          orgId: activeOrgId ?? undefined,
          body: input,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptPlans(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Package created.");
    },
    onError: (error) => notifyMutationError(error, "Could not create package."),
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
