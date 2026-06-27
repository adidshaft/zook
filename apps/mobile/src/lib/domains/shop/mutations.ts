import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { invalidations } from "@/lib/domains/shared/invalidate";
import { queryKeys } from "@/lib/domains/shared/keys";
import {
  getMutationContext,
  notifyMutationError,
  notifyMutationSuccess,
} from "@/lib/domains/shared/request";
import type { ShopOrderRecord } from "@/lib/domains/shared/types";
import { useT } from "@/lib/i18n";

export function useFulfillShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
    onMutate: async (input) => {
      const orderId = typeof input === "string" ? input : input.orderId;
      const queryKeyActive = queryKeys.shop.activeOrders(resolvedOrgId, selectedBranchId);

      await queryClient.cancelQueries({ queryKey: queryKeyActive });

      const previousOrders = queryClient.getQueryData<{ orders: ShopOrderRecord[] }>(queryKeyActive);

      if (previousOrders) {
        queryClient.setQueryData(queryKeyActive, {
          orders: previousOrders.orders.filter((order) => order.id !== orderId),
        });
      }

      return { previousOrders };
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.shop.activeOrders(queryClient, resolvedOrgId),
        invalidations.shop.orders(queryClient),
        invalidations.shop.catalog(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess(t("shop.mutation.pickupFulfilled"));
    },
    onError: (error, _variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(
          queryKeys.shop.activeOrders(resolvedOrgId, selectedBranchId),
          context.previousOrders,
        );
      }
      notifyMutationError(error, t("shop.mutation.pickupFulfillFailed"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shop.activeOrders(resolvedOrgId, selectedBranchId),
      });
    },
  });
}

export function useCreateShopOrder(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  const t = useT();
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
      notifyMutationSuccess(t("shop.mutation.orderCreated"));
    },
    onError: (error) => {
      notifyMutationError(error, t("shop.mutation.orderCreateFailed"));
    },
  });
}
