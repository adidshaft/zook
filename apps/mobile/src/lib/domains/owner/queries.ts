import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { queryKeys } from "@/lib/domains/shared/keys";
import type {
  OrgJoinRequestRecord,
  OrgMemberRecord,
  OwnerDashboardData,
} from "@/lib/domains/shared/types";

export function useOwnerDashboard(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.dashboard(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<OwnerDashboardData>(`/orgs/${resolvedOrgId}/dashboard`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useOrgJoinRequests(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.approvals(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<{ joinRequests: OrgJoinRequestRecord[] }>(
        `/orgs/${resolvedOrgId}/join-requests`,
        {
          token,
          orgId: resolvedOrgId,
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useOrgMembers(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.owner.members(resolvedOrgId),
    queryFn: () =>
      mobileApiFetch<{ members: OrgMemberRecord[] }>(`/orgs/${resolvedOrgId}/members`, {
        token,
        orgId: resolvedOrgId,
      }),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}
