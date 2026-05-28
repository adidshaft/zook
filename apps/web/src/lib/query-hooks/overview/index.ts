"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";
import type { OrganizationDashboardReadModel } from "@/server/domains/overview";

export function useDashboardSummary(orgId?: string, branchId?: string) {
  return useQuery<OrganizationDashboardReadModel>({
    queryKey: ["dashboard", orgId, branchId ?? null],
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchId) {
        params.set("branchId", branchId);
      }
      const query = params.toString();
      return webApiFetch(`/api/orgs/${orgId}/dashboard${query ? `?${query}` : ""}`);
    },
    enabled: Boolean(orgId),
    staleTime: 8_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}
