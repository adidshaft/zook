"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function usePlatformOrganizations() {
  return useQuery({
    queryKey: ["platform-organizations"],
    queryFn: () => webApiFetch("/api/platform/orgs"),
  });
}
