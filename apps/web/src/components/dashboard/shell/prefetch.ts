"use client";

import type { QueryClient } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

function withCursor(path: string, cursor: string | null) {
  const [rawPathname, queryString = ""] = path.split("?");
  const pathname = rawPathname ?? path;
  const params = new URLSearchParams(queryString);
  if (cursor) {
    params.set("cursor", cursor);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function resourcePathsForDashboardHref(
  href: string,
  orgId?: string,
  branchId?: string,
) {
  if (!orgId) return [];
  const branchParam = branchId ? `branchId=${encodeURIComponent(branchId)}` : "";
  const withBranch = (path: string) =>
    branchParam ? `${path}${path.includes("?") ? "&" : "?"}${branchParam}` : path;

  if (href.startsWith("/dashboard/members")) {
    return [
      withBranch(`/api/orgs/${orgId}/members?limit=50`),
      `/api/orgs/${orgId}/join-requests`,
      withBranch(`/api/orgs/${orgId}/membership-plans`),
    ];
  }
  if (href.startsWith("/dashboard/payments")) {
    return [
      withBranch(`/api/orgs/${orgId}/payments?limit=50`),
      withBranch(`/api/orgs/${orgId}/shop/orders`),
      withBranch(`/api/orgs/${orgId}/membership-plans`),
    ];
  }
  if (href.startsWith("/dashboard/attendance")) {
    return [withBranch(`/api/orgs/${orgId}/attendance?limit=50`)];
  }
  if (href.startsWith("/dashboard/shop")) {
    return [
      withBranch(`/api/orgs/${orgId}/products`),
      withBranch(`/api/orgs/${orgId}/shop/orders`),
    ];
  }
  if (href.startsWith("/dashboard/staff")) {
    return [`/api/orgs/${orgId}/staff`, `/api/orgs/${orgId}/plans`];
  }
  if (href.startsWith("/dashboard/plans/referrals")) {
    return [
      `/api/orgs/${orgId}/referral-policy`,
      `/api/orgs/${orgId}/referrals`,
      `/api/orgs/${orgId}/referral-analytics`,
      `/api/orgs/${orgId}/coupons`,
    ];
  }
  if (href.startsWith("/dashboard/plans/coupons")) {
    return [`/api/orgs/${orgId}/coupons`];
  }
  if (href.startsWith("/dashboard/plans/offers")) {
    return [`/api/orgs/${orgId}/offers`, withBranch(`/api/orgs/${orgId}/membership-plans`)];
  }
  if (href.startsWith("/dashboard/plans")) {
    return [withBranch(`/api/orgs/${orgId}/membership-plans`), `/api/orgs/${orgId}/plans`];
  }
  if (href.startsWith("/dashboard/classes")) {
    return [withBranch(`/api/orgs/${orgId}/classes`), `/api/orgs/${orgId}/staff`];
  }
  if (href.startsWith("/dashboard/notifications")) {
    return [`/api/orgs/${orgId}/notifications`];
  }
  if (href.startsWith("/dashboard/audit")) {
    return [`/api/orgs/${orgId}/audit-logs?limit=100`, `/api/orgs/${orgId}/ai/usage`];
  }
  if (href.startsWith("/dashboard/ai")) {
    return [`/api/orgs/${orgId}/ai/usage`, `/api/orgs/${orgId}/plans`];
  }
  if (href.startsWith("/dashboard/branches")) {
    return [`/api/orgs/${orgId}/branches`, `/api/orgs/${orgId}/staff`];
  }
  if (href.startsWith("/dashboard/billing")) {
    return [
      `/api/orgs/${orgId}/billing-profile`,
      `/api/orgs/${orgId}/billing/subscription`,
      `/api/orgs/${orgId}/invoices`,
    ];
  }
  if (href.startsWith("/dashboard/public-profile")) {
    return [`/api/orgs/${orgId}/profile`];
  }
  if (href.startsWith("/dashboard/payouts")) {
    return [`/api/orgs/${orgId}/payouts`];
  }
  if (href.startsWith("/dashboard/settings")) {
    return [
      `/api/orgs/${orgId}/billing-profile`,
      `/api/orgs/${orgId}/billing/subscription`,
      `/api/orgs/${orgId}/branches`,
      `/api/orgs/${orgId}/profile`,
    ];
  }
  return [];
}

export function prefetchDashboardHref({
  queryClient,
  href,
  orgId,
  branchId,
}: {
  queryClient: QueryClient;
  href: string;
  orgId?: string | undefined;
  branchId?: string | undefined;
}) {
  const paths = resourcePathsForDashboardHref(href, orgId, branchId);
  for (const path of paths) {
    if (path.includes("limit=")) {
      void queryClient.prefetchInfiniteQuery({
        queryKey: ["operational-resource", path],
        initialPageParam: null,
        queryFn: ({ pageParam }) =>
          webApiFetch<{ nextCursor?: string | null }>(
            withCursor(path, pageParam as string | null),
          ),
        getNextPageParam: () => undefined,
        staleTime: 120_000,
      });
    } else {
      void queryClient.prefetchQuery({
        queryKey: ["operational-resource", path],
        queryFn: () => webApiFetch(path),
        staleTime: 120_000,
      });
    }
  }
}
