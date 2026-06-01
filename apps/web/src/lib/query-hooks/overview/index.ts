"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";
import type { DashboardData } from "@/lib/data";

export type DashboardSummaryData = Pick<
  DashboardData,
  "summary" | "charts" | "products" | "aiUsage" | "auditLogCount"
>;

type DashboardSummaryOptions = {
  initialData?: DashboardSummaryData;
  hydrateDelayMs?: number;
};

export function useDashboardSummary(
  orgId?: string,
  branchId?: string,
  options: DashboardSummaryOptions = {},
) {
  const [canHydrateDetails, setCanHydrateDetails] = useState(false);
  const initialData = options.initialData;
  const hasInitialData = initialData !== undefined;

  useEffect(() => {
    setCanHydrateDetails(false);
    if (!orgId) return;

    const delay = options.hydrateDelayMs ?? 3_500;
    const scheduleHydration = () => setCanHydrateDetails(true);
    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(scheduleHydration, { timeout: delay + 1_500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(scheduleHydration, delay);
    return () => globalThis.clearTimeout(timeoutId);
  }, [orgId, branchId, options.hydrateDelayMs]);

  const queryOptions = {
    queryKey: ["dashboard", orgId, branchId ?? null] as const,
    queryFn: () => {
      const params = new URLSearchParams();
      if (branchId) {
        params.set("branchId", branchId);
      }
      const query = params.toString();
      return webApiFetch<DashboardSummaryData>(
        `/api/orgs/${orgId}/dashboard${query ? `?${query}` : ""}`,
      );
    },
    enabled: Boolean(orgId) && (!hasInitialData || canHydrateDetails),
    staleTime: hasInitialData ? 60_000 : 15_000,
    gcTime: 5 * 60_000,
    refetchInterval: false as const,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
  };

  if (hasInitialData) {
    return useQuery<DashboardSummaryData>({ ...queryOptions, initialData, initialDataUpdatedAt: 0 });
  }

  return useQuery<DashboardSummaryData>(queryOptions);
}
