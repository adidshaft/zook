"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useAttendanceSummary(orgId?: string) {
  return useQuery({
    queryKey: ["attendance-summary", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/attendance/live`),
    enabled: Boolean(orgId),
  });
}
