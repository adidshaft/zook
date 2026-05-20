import { useQuery } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { queryKeys } from "@/lib/domains/shared/keys";
import { queryString } from "@/lib/domains/shared/request";
import type { ShopOrderRecord, ShopProductRecord } from "@/lib/domains/shared/types";

export function useShopProducts(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.shop.catalog(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ products: ShopProductRecord[] }>(
        `/orgs/${resolvedOrgId}/products${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
  });
}

export function useOrgProducts(orgId?: string) {
  return useShopProducts(orgId);
}

export function useMyShopOrders() {
  const { status, token } = useAuth();
  return useQuery({
    queryKey: queryKeys.shop.orders(),
    queryFn: () => mobileApiFetch<{ orders: ShopOrderRecord[] }>("/me/shop-orders", { token }),
    enabled: status === "authenticated" && Boolean(token),
  });
}

export function useOrgActiveShopOrders(orgId?: string) {
  const { activeOrgId, status, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useQuery({
    queryKey: queryKeys.shop.activeOrders(resolvedOrgId, selectedBranchId),
    queryFn: () =>
      mobileApiFetch<{ orders: ShopOrderRecord[]; summary?: { fulfilledToday?: number } }>(
        `/orgs/${resolvedOrgId}/shop/orders/active${queryString({ branchId: selectedBranchId })}`,
        {
          token,
          orgId: resolvedOrgId,
          ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
        },
      ),
    enabled: status === "authenticated" && Boolean(token) && Boolean(resolvedOrgId),
    refetchInterval: 30_000,
  });
}
