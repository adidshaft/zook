"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useNotifications(orgId?: string) {
  return useQuery({
    queryKey: ["notifications", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/notifications`),
    enabled: Boolean(orgId),
  });
}
