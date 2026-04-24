"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "./api-client";

export function useDashboardSummary(orgId?: string) {
  return useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/dashboard`),
    enabled: Boolean(orgId)
  });
}

export function useMembers(orgId?: string) {
  return useQuery({
    queryKey: ["members", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/members`),
    enabled: Boolean(orgId)
  });
}

export function useMembershipPlans(orgId?: string) {
  return useQuery({
    queryKey: ["membership-plans", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/membership-plans`),
    enabled: Boolean(orgId)
  });
}

export function useJoinRequests(orgId?: string) {
  return useQuery({
    queryKey: ["join-requests", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/join-requests`),
    enabled: Boolean(orgId)
  });
}

export function useAttendanceSummary(orgId?: string) {
  return useQuery({
    queryKey: ["attendance-summary", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/attendance/live`),
    enabled: Boolean(orgId)
  });
}

export function useNotifications(orgId?: string) {
  return useQuery({
    queryKey: ["notifications", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/notifications`),
    enabled: Boolean(orgId)
  });
}

export function useShopOrders(orgId?: string) {
  return useQuery({
    queryKey: ["shop-orders", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/shop/orders`),
    enabled: Boolean(orgId)
  });
}

export function useProducts(orgId?: string) {
  return useQuery({
    queryKey: ["products", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/products`),
    enabled: Boolean(orgId)
  });
}

export function useAIUsage(orgId?: string) {
  return useQuery({
    queryKey: ["ai-usage", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/ai/usage`),
    enabled: Boolean(orgId)
  });
}

export function useAuditLogs(orgId?: string) {
  return useQuery({
    queryKey: ["audit-logs", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/audit-logs`),
    enabled: Boolean(orgId)
  });
}

export function usePlatformOrganizations() {
  return useQuery({
    queryKey: ["platform-organizations"],
    queryFn: () => webApiFetch("/api/platform/orgs")
  });
}
