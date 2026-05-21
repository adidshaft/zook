"use client";

import { useQuery } from "@tanstack/react-query";
import { webApiFetch } from "@/lib/api-client";

export function useShopOrders(orgId?: string) {
  return useQuery({
    queryKey: ["shop-orders", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/shop/orders`),
    enabled: Boolean(orgId),
  });
}

export function useProducts(orgId?: string) {
  return useQuery({
    queryKey: ["products", orgId],
    queryFn: () => webApiFetch(`/api/orgs/${orgId}/products`),
    enabled: Boolean(orgId),
  });
}
