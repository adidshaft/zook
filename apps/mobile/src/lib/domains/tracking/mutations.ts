import { useMutation, useQueryClient } from "@tanstack/react-query";

import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { HabitCategory, HabitRecord } from "@/lib/domains/shared/types";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import { useT } from "@/lib/i18n";

export type CreateHabitInput = {
  title: string;
  category: HabitCategory;
  targetValue?: number;
  unit?: string;
  frequency?: "DAILY" | "WEEKLY";
};

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const { token, activeOrgId } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: (input: CreateHabitInput) =>
      mobileApiFetch<{ habit: HabitRecord }>("/me/tracking/habits", {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          title: input.title,
          category: input.category,
          frequency: input.frequency ?? "DAILY",
          ...(input.targetValue !== undefined ? { targetValue: input.targetValue } : {}),
          ...(input.unit ? { unit: input.unit } : {}),
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.habits() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.summary() }),
      ]);
      notifyMutationSuccess(t("tracking.mutation.habitAdded"));
    },
    onError: (error) => notifyMutationError(error, t("tracking.mutation.habitAddFailed")),
  });
}

export function useLogHabit() {
  const queryClient = useQueryClient();
  const { token, activeOrgId } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: ({ habitId, completed }: { habitId: string; completed: boolean }) =>
      mobileApiFetch<{ log: { id: string } }>(`/me/tracking/habits/${habitId}/log`, {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: { completed },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.habits() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.summary() }),
      ]);
    },
    onError: (error) => notifyMutationError(error, t("tracking.mutation.habitUpdateFailed")),
  });
}
