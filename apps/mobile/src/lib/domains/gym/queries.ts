import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type { GymProfileData, GymSearchResult } from "@/lib/domains/shared/types";

export function useGymSearch(input: { query?: string; city?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.gym.search(input.query, input.city),
    queryFn: () =>
      mobileApiFetch<{ gyms: GymSearchResult[] }>(
        `/orgs/public/search${queryString({ q: input.query, city: input.city })}`,
      ),
  });
}

export function useGymProfile(username: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: queryKeys.gym.profile(username),
    queryFn: () => mobileApiFetch<GymProfileData>(`/orgs/public/${username}`, { token }),
    enabled: Boolean(username),
  });
}

export type GymReview = {
  id: string;
  userId: string;
  name: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type GymReviewsData = {
  summary: { average: number; count: number; breakdown: Record<string, number> };
  reviews: GymReview[];
  canReview: boolean;
  myReview: GymReview | null;
};

export function useGymReviews(orgId?: string | null) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["org", orgId, "reviews"] as const,
    queryFn: () =>
      mobileApiFetch<GymReviewsData>(`/orgs/${orgId}/reviews`, { token, orgId: orgId ?? undefined }),
    enabled: Boolean(orgId),
    staleTime: 30_000,
  });
}
