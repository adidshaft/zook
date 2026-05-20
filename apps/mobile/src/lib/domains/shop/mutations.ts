import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { invalidations } from "@/lib/domains/shared/invalidate";
import {
  getMutationContext,
  notifyMutationError,
  notifyMutationSuccess,
} from "@/lib/domains/shared/request";
import type { ShopOrderRecord } from "@/lib/domains/shared/types";

export function useFulfillShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (
      input:
        | string
        | {
            orderId: string;
            skipCode?: boolean;
            skipReason?: string;
          },
    ) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ order: ShopOrderRecord }>(
        `/orgs/${ctx.orgId}/shop/orders/${orderId}/fulfill`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          body:
            typeof input === "string"
              ? undefined
              : {
                  pickupCodeSkipped: Boolean(input.skipCode),
                  ...(input.skipReason ? { skipReason: input.skipReason } : {}),
                },
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.shop.activeOrders(queryClient, resolvedOrgId),
        invalidations.shop.orders(queryClient),
        invalidations.shop.catalog(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Pickup order fulfilled.");
    },
    onError: (error) => {
      notifyMutationError(error, "Pickup order could not be fulfilled.");
    },
  });
}

export function useCreateShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (input: {
      items: Array<{ productId: string; quantity: number }>;
      branchId?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const branchId = input.branchId ?? selectedBranchId;
      return mobileApiFetch<{
        order: ShopOrderRecord;
        checkoutUrl?: string;
        checkoutData?: Record<string, unknown> | null;
        session: { id: string; status: string; provider?: string };
      }>("/shop/orders", {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        ...(branchId ? { branchId } : {}),
        body: { orgId: ctx.orgId, items: input.items, ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.shop.orders(queryClient),
        invalidations.shop.catalog(queryClient, resolvedOrgId),
        invalidations.shop.activeOrders(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Order created.");
    },
    onError: (error) => {
      notifyMutationError(error, "Order could not be created.");
    },
  });
}
