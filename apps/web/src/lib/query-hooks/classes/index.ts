"use client";

import { useQuery } from "@tanstack/react-query";
import type { ClassRow } from "@/components/dashboard/types";
import { webApiFetch } from "@/lib/api-client";

function classPath(orgId: string, branchId?: string | null) {
  if (!branchId) {
    return `/api/orgs/${orgId}/classes`;
  }
  return `/api/orgs/${orgId}/classes?branchId=${encodeURIComponent(branchId)}`;
}

export function useClasses(orgId?: string, branchId?: string | null) {
  return useQuery({
    queryKey: ["classes", orgId, branchId ?? "all"],
    queryFn: () => webApiFetch<{ classes: ClassRow[] }>(classPath(orgId!, branchId)),
    enabled: Boolean(orgId),
  });
}
