"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useMembers(orgId?: string) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/members`),
    enabled: Boolean(orgId),
  });
}

export function useJoinRequests(orgId?: string) {
  return useQuery({
    queryKey: ["join-requests", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/join-requests`),
    enabled: Boolean(orgId),
  });
}
