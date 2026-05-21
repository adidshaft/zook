"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useAuditLogs(orgId?: string) {
  return useQuery({
    queryKey: ["audit-logs", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/audit-logs`),
    enabled: Boolean(orgId),
  });
}
