import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { notifyMutationError, notifyMutationSuccess } from "@/lib/domains/shared/request";
import { useT } from "@/lib/i18n";

export type RewardStatus =
  | "PENDING"
  | "QUALIFIED"
  | "PAYABLE"
  | "PAID"
  | "REVERSED"
  | "REQUESTED";

export type RewardEntry = {
  id: string;
  kind: string;
  label: string;
  amountPaise: number;
  status: RewardStatus;
  createdAt: string;
  referredName?: string | null;
};

export type RewardsWallet = {
  balancePaise: number;
  pendingPaise: number;
  payablePaise: number;
  lifetimePaise: number;
  currency: string;
  entries: RewardEntry[];
};

export type GymReferral = {
  code: string;
  shareUrl: string;
  qualifyingCycles: string[];
  rewardPaise?: number;
  rewardDays?: number;
  terms: string;
};

export function useRewardsWallet() {
  const { activeRole, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "rewards", "wallet", activeRole ?? null] as const,
    queryFn: () =>
      mobileApiFetch<RewardsWallet>(
        `/me/rewards/wallet${activeRole ? `?role=${activeRole}` : ""}`,
        { token: token ?? undefined },
      ),
    enabled: status === "authenticated" && Boolean(token),
    staleTime: 30_000,
  });
}

export function useGymReferral() {
  const { activeRole, status, token } = useAuth();
  return useQuery({
    queryKey: ["me", "rewards", "gym-referral", activeRole ?? null] as const,
    queryFn: () =>
      mobileApiFetch<GymReferral>(
        `/me/rewards/gym-referral${activeRole ? `?role=${activeRole}` : ""}`,
        { token: token ?? undefined },
      ),
    enabled: status === "authenticated" && Boolean(token),
    staleTime: 60_000,
  });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const t = useT();
  return useMutation({
    mutationFn: (amountPaise: number) => {
      if (!token) {
        throw new Error(t("rewards.mutation.signInWithdrawal"));
      }
      return mobileApiFetch<{ withdrawal: { id: string; status: string } }>(
        "/me/rewards/withdrawals",
        { method: "POST", token, body: { amountPaise } },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "rewards", "wallet"] });
      notifyMutationSuccess(t("rewards.mutation.withdrawalRequested"));
    },
    onError: (error) => notifyMutationError(error, t("rewards.mutation.withdrawalFailed")),
  });
}
