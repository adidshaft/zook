import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import { useT } from "@/lib/i18n";

export function useSubmitReview(orgId?: string | null) {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: ({ rating, body }: { rating: number; body: string }) => {
      if (!token || !orgId) {
        throw new Error(t("gym.mutation.signInReview"));
      }
      return mobileApiFetch<{ review: { id: string } }>(`/orgs/${orgId}/reviews`, {
        method: "POST",
        token,
        orgId,
        body: { rating, body },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["org", orgId, "reviews"] });
      notifyMutationSuccess(t("gym.mutation.reviewThanks"));
    },
    onError: (error) => notifyMutationError(error, t("gym.mutation.reviewFailed")),
  });
}
