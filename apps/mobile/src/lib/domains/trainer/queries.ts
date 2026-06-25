import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import type {
  BodyProgressEntryRecord,
  DietPlanRecord,
  PtPlanRecord,
  PtSubscriptionRecord,
  TrainerClientRecord,
  TrainerPayoutConfigRecord,
  TrainerPayoutRecord,
  TrainerProfileRecord,
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

export type UpdatePtPlanInput = Partial<CreatePtPlanInput> & { planId: string };

export function useUpdatePtPlan() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: ({ planId, ...input }: UpdatePtPlanInput) =>
      mobileApiFetch<{ plan: PtPlanRecord }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/pt-plans/${planId}`,
        {
          method: "PATCH",
          token,
          orgId: activeOrgId ?? undefined,
          body: input,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptPlans(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Package updated.");
    },
    onError: (error) => notifyMutationError(error, "Could not update package."),
  });
}

export function useDeletePtPlan() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (planId: string) =>
      mobileApiFetch<{ ok: boolean }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/pt-plans/${planId}`,
        { method: "DELETE", token, orgId: activeOrgId ?? undefined },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptPlans(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Package removed.");
    },
    onError: (error) => notifyMutationError(error, "Could not remove package."),
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

export function useMyTrainerPayoutConfig() {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.payoutConfig(activeOrgId, trainerUserId),
    queryFn: () =>
      mobileApiFetch<{ config: TrainerPayoutConfigRecord | null }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/payout-config`,
        { token, orgId: activeOrgId },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}

export type UpdateTrainerPayoutConfigInput = {
  baseMonthlyPaise: number;
  ptCommissionPercent: number;
  perSessionFeePaise: number;
  payDay: number;
};

export function useUpdateMyTrainerPayoutConfig() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: UpdateTrainerPayoutConfigInput) =>
      mobileApiFetch<{ config: TrainerPayoutConfigRecord }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/payout-config`,
        {
          method: "PUT",
          token,
          orgId: activeOrgId ?? undefined,
          body: input,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.payoutConfig(activeOrgId, trainerUserId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.payouts(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Payout settings saved.");
    },
    onError: (error) => notifyMutationError(error, "Could not save payout settings."),
  });
}

export function useTrainerProfile() {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.profile(activeOrgId, trainerUserId),
    queryFn: () =>
      mobileApiFetch<{ profile: TrainerProfileRecord }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/profile`,
        { token, orgId: activeOrgId },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId) && Boolean(trainerUserId),
  });
}

export type UpdateTrainerProfileInput = {
  bio?: string;
  upiId?: string;
  upiQrUrl?: string;
};

export function useUpdateTrainerProfile() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: (input: UpdateTrainerProfileInput) =>
      mobileApiFetch<{ profile: TrainerProfileRecord }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/profile`,
        {
          method: "PATCH",
          token,
          orgId: activeOrgId ?? undefined,
          body: input,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.profile(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("Profile saved.");
    },
    onError: (error) => notifyMutationError(error, "Could not save profile."),
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

export function useApprovePtSubscription() {
  const queryClient = useQueryClient();
  const { activeOrgId, session, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useMutation({
    mutationFn: ({ subscriptionId }: { subscriptionId: string }) =>
      mobileApiFetch<{ subscription: PtSubscriptionRecord }>(
        `/orgs/${activeOrgId}/pt-subscriptions/${subscriptionId}/approve`,
        {
          method: "POST",
          token,
          orgId: activeOrgId ?? undefined,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.trainer.ptSubscriptions(activeOrgId, trainerUserId),
      });
      notifyMutationSuccess("PT request approved.");
    },
    onError: (error) => notifyMutationError(error, "Could not approve the request."),
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

export function useClientDietPlans(clientId?: string | null) {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.clientDietPlans(activeOrgId, trainerUserId, clientId),
    queryFn: () =>
      mobileApiFetch<{ plans: DietPlanRecord[] }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/clients/${clientId}/diet-plans`,
        { token, orgId: activeOrgId },
      ),
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(activeOrgId) &&
      Boolean(trainerUserId) &&
      Boolean(clientId),
  });
}

export function useClientBodyProgress(clientId?: string | null) {
  const { activeOrgId, session, status, token } = useAuth();
  const trainerUserId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.trainer.clientBodyProgress(activeOrgId, trainerUserId, clientId),
    queryFn: () =>
      mobileApiFetch<{ entries: BodyProgressEntryRecord[] }>(
        `/orgs/${activeOrgId}/trainers/${trainerUserId}/clients/${clientId}/body-progress`,
        { token, orgId: activeOrgId },
      ),
    enabled:
      status === "authenticated" &&
      Boolean(token) &&
      Boolean(activeOrgId) &&
      Boolean(trainerUserId) &&
      Boolean(clientId),
  });
}

export type CreateClassInput = {
  name: string;
  classType: string;
  maxCapacity: number;
  startTime: string;
  durationMin?: number;
  description?: string;
  pricePaise?: number;
  trainerCommissionBps?: number | null;
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

export type UpdateClassInput = Partial<CreateClassInput> & { classId: string };

export function useUpdateClass() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: ({ classId, ...input }: UpdateClassInput) =>
      mobileApiFetch<{ class: { id: string } }>(`/orgs/${activeOrgId}/classes/${classId}`, {
        method: "PATCH",
        token,
        orgId: activeOrgId ?? undefined,
        body: input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "classes"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.member.classes(activeOrgId, null) });
      notifyMutationSuccess("Class updated.");
    },
    onError: (error) => notifyMutationError(error, "Could not update class."),
  });
}

export function useCancelClass() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: (classId: string) =>
      mobileApiFetch<{ class: { id: string } }>(`/orgs/${activeOrgId}/classes/${classId}/cancel`, {
        method: "POST",
        token,
        orgId: activeOrgId ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "classes"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.member.classes(activeOrgId, null) });
      notifyMutationSuccess("Class cancelled.");
    },
    onError: (error) => notifyMutationError(error, "Could not cancel class."),
  });
}

export type ClassAttendanceStatus = "PENDING" | "ATTENDED" | "NO_SHOW";

export type ClassRosterEntry = {
  memberId: string;
  name: string | null;
  status: string;
  enrolledAt: string;
  attendanceStatus: ClassAttendanceStatus;
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

export function useMarkClassAttendance(classId?: string | null) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const queryKey = ["org", activeOrgId, "class-roster", classId ?? null] as const;
  return useMutation({
    mutationFn: ({ memberId, status }: { memberId: string; status: ClassAttendanceStatus }) =>
      mobileApiFetch<{ ok: boolean; memberId: string; attendanceStatus: ClassAttendanceStatus }>(
        `/orgs/${activeOrgId}/classes/${classId}/roster/${memberId}/attendance`,
        { method: "POST", token, orgId: activeOrgId ?? undefined, body: { status } },
      ),
    onMutate: async ({ memberId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ClassRosterData>(queryKey);
      if (previous) {
        queryClient.setQueryData<ClassRosterData>(queryKey, {
          ...previous,
          roster: previous.roster.map((entry) =>
            entry.memberId === memberId ? { ...entry, attendanceStatus: status } : entry,
          ),
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      notifyMutationError(error, "Attendance could not be updated.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
