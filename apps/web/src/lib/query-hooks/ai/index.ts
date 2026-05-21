"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useAIUsage(orgId?: string) {
  return useQuery({
    queryKey: ["ai-usage", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/ai/usage`),
    enabled: Boolean(orgId),
  });
}
