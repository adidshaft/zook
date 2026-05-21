"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useDashboardSummary(orgId?: string) {
  return useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/dashboard`),
    enabled: Boolean(orgId),
  });
}
