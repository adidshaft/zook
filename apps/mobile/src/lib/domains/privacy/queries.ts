import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type { PrivacyRequestRecord } from "@/lib/domains/shared/types";

export function useMyConsents() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.privacy.consents(),
    queryFn: () =>
      mobileApiFetch<{
        exportRequests: PrivacyRequestRecord[];
        deletionRequests: PrivacyRequestRecord[];
        exportJobs: PrivacyRequestRecord[];
        deletionJobs: PrivacyRequestRecord[];
      }>("/me/consents", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}
