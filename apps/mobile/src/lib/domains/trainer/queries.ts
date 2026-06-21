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

export type RecordPtSubscriptionInput = {
  memberUserId: string;
  ptPlanId?: string;
  amountPaise: number;
  paymentMode: "CASH" | "DIRECT_UPI" | "OTHER";
  totalSessions?: number;
};

export function useRecordPtSubscription() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: RecordPtSubscriptionInput) =>
      mobileApiFetch<{ subscription: PtSubscriptionRecord }>(
        `/orgs/${activeOrgId}/pt-subscriptions`,
        {
          method: "POST",
          token,
          orgId: activeOrgId ?? undefined,
          body: { ...input, trainerUserId },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptSubscriptions(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("PT client added.");
    },
    onError: (error) => notifyMutationError(error, "Could not add client."),
  });
}

export function useLogPtSession() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: ({ subscriptionId, notes }: { subscriptionId: string; notes?: string }) =>
      mobileApiFetch<{ subscription: PtSubscriptionRecord }>(`/orgs/${activeOrgId}/pt-sessions`, {
        method: "POST",
        token,
        orgId: activeOrgId ?? undefined,
        body: { subscriptionId, ...(notes ? { notes } : {}) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptSubscriptions(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Session logged.");
    },
    onError: (error) => notifyMutationError(error, "Could not log session."),
  });
}

export type DietPlanMealInput = {
  name: string;
  timeOfDay?: string;
  items?: string[];
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatsG?: number;
};

export function useCreateClientDietPlan(clientId: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: {
      title: string;
      calorieTarget?: number;
      proteinG?: number;
      carbsG?: number;
      fatsG?: number;
      meals: DietPlanMealInput[];
    }) =>
      mobileApiFetch<{ plan: { id: string; title: string } }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/clients/${clientId}/diet-plans`,
        {
          method: "POST",
          token,
          orgId: activeOrgId ?? undefined,
          body: { ...input, status: "PUBLISHED" },
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.clients(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Diet plan published.");
    },
    onError: (error) => notifyMutationError(error, "Could not publish diet plan."),
  });
}

export type CreateClassInput = {
  name: string;
  classType: string;
  maxCapacity: number;
  startTime: string;
  durationMin?: number;
  description?: string;
};

export function useCreateClass() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: CreateClassInput) =>
      mobileApiFetch<{ class: { id: string } }>(`/orgs/${activeOrgId}/classes`, {
        method: "POST",
        token,
        orgId: activeOrgId ?? undefined,
        body: { ...input, trainerId: trainerUserId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "classes"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.member.classes(activeOrgId, null) });
      notifyMutationSuccess("Class scheduled.");
    },
    onError: (error) => notifyMutationError(error, "Could not schedule class."),
  });
}

export type ClassRosterEntry = {
  memberId: string;
  name: string | null;
  status: string;
  enrolledAt: string;
};

export type ClassRosterData = {
  class: { id: string; name: string; startTime: string; maxCapacity: number };
  roster: ClassRosterEntry[];
};

export function useClassRoster(classId?: string | null) {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["org", activeOrgId, "class-roster", classId ?? null] as const,
    queryFn: () =>
      mobileApiFetch<ClassRosterData>(`/orgs/${activeOrgId}/classes/${classId}/roster`, {
        token,
        orgId: activeOrgId ?? undefined,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(classId),
    staleTime: 15_000,
  });
}
