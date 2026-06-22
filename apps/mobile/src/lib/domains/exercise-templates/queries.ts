import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";

export type ExerciseTemplateRecord = {
  id: string;
  orgId?: string | null;
  scope: "STARTER" | "ORG" | "TRAINER";
  createdByUserId?: string | null;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  featured?: boolean;
  active?: boolean;
  readOnly?: boolean;
};

export type ExerciseTemplateInput = {
  scope?: "ORG" | "TRAINER";
  name?: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultRestSeconds?: number | null;
  tempo?: string | null;
  notes?: string | null;
  featured?: boolean;
  starterId?: string;
};

export function useOrgExerciseTemplates() {
  const { activeOrgId, status, token } = useAuth();
  return useQuery({
    queryKey: ["org", activeOrgId, "exercise-templates"] as const,
    queryFn: () =>
      mobileApiFetch<{ templates: ExerciseTemplateRecord[] }>(
        `/orgs/${activeOrgId}/exercise-templates`,
        { token, orgId: activeOrgId ?? undefined },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(activeOrgId),
    staleTime: 30_000,
  });
}

export function useSaveExerciseTemplate() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: async (input: { templateId?: string; body: ExerciseTemplateInput }) => {
      if (!activeOrgId || !token) throw new Error("Sign in again to save templates.");
      return mobileApiFetch<{ template: ExerciseTemplateRecord }>(
        `/orgs/${activeOrgId}/exercise-templates${input.templateId ? `/${input.templateId}` : ""}`,
        {
          method: input.templateId ? "PATCH" : "POST",
          token,
          orgId: activeOrgId,
          body: input.body,
        },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "exercise-templates"] });
      notifyMutationSuccess("Exercise template saved.");
    },
    onError: (error) => notifyMutationError(error, "Could not save exercise template."),
  });
}

export function useDeleteExerciseTemplate() {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!activeOrgId || !token) throw new Error("Sign in again to remove templates.");
      return mobileApiFetch<{ template: ExerciseTemplateRecord }>(
        `/orgs/${activeOrgId}/exercise-templates/${templateId}`,
        { method: "DELETE", token, orgId: activeOrgId },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "exercise-templates"] });
      notifyMutationSuccess("Exercise template removed.");
    },
    onError: (error) => notifyMutationError(error, "Could not remove exercise template."),
  });
}
