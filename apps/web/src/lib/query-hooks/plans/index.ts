"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useMembershipPlans(orgId?: string) {
  return useQuery({
    queryKey: ["membership-plans", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/membership-plans`),
    enabled: Boolean(orgId),
  });
}
