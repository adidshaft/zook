import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PaymentMode } from "@zook/core";
import { mobileApiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useBranchSelection } from "@/lib/branch-selection";
import { invalidations } from "@/lib/domains/shared/invalidate";
import {
  getMutationContext,
  notifyMutationError,
  notifyMutationSuccess,
} from "@/lib/domains/shared/request";
import type { InvoiceRecord, OrgPaymentRecord } from "@/lib/domains/shared/types";

type ManualPaymentMode = Extract<
  PaymentMode,
  "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "CARD" | "OTHER"
>;

export function useGeneratePaymentDocument() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  return useMutation({
    mutationFn: ({ paymentId, kind }: { paymentId: string; kind: "receipt" | "invoice" }) =>
      mobileApiFetch<{
        receiptNumber?: string;
        receiptUrl?: string;
        invoice?: InvoiceRecord;
        invoiceUrl?: string;
        payment?: OrgPaymentRecord;
      }>(`/me/payments/${paymentId}/${kind}`, { method: "POST", token }),
    onSuccess: async () => {
      await Promise.all([
        invalidations.member.membership(queryClient),
        invalidations.payments.invoices(queryClient),
      ]);
    },
  });
}

export function useRefundPayment(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: ({
      paymentId,
      reason,
      amountPaise,
    }: {
      paymentId: string;
      reason: string;
      amountPaise?: number;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      return mobileApiFetch<{ payment: OrgPaymentRecord }>(
        `/orgs/${ctx.orgId}/payments/${paymentId}/refund`,
        {
          method: "POST",
          token: ctx.token,
          orgId: ctx.orgId,
          body: { reason, ...(amountPaise ? { amountPaise } : {}) },
        },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.payments.all(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Refund issued.");
    },
    onError: (error) => {
      notifyMutationError(error, "Refund could not be issued.");
    },
  });
}

export function useRecordManualPayment(orgId?: string) {
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  const resolvedOrgId = orgId ?? activeOrgId;
  return useMutation({
    mutationFn: (body: {
      memberUserId: string;
      planId?: string;
      subscriptionId?: string;
      amountPaise: number;
      mode: ManualPaymentMode;
      proofAssetId?: string;
      receiptNumber?: string;
      notes?: string;
      branchId?: string;
    }) => {
      const ctx = getMutationContext(token, resolvedOrgId);
      const branchId = body.branchId ?? selectedBranchId;
      return mobileApiFetch<{
        payment: OrgPaymentRecord;
        subscription?: Record<string, unknown> | null;
      }>(`/orgs/${ctx.orgId}/manual-payments`, {
        method: "POST",
        token: ctx.token,
        orgId: ctx.orgId,
        ...(branchId ? { branchId } : {}),
        body: { ...body, ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.payments.all(queryClient, resolvedOrgId),
        invalidations.owner.members(queryClient, resolvedOrgId),
        invalidations.owner.dashboard(queryClient, resolvedOrgId),
      ]);
      notifyMutationSuccess("Payment recorded.");
    },
    onError: (error) => {
      notifyMutationError(error, "Payment could not be recorded.");
    },
  });
}

export function useCompleteMockPayment() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const { selectedBranchId } = useBranchSelection();
  return useMutation({
    mutationFn: (input: string | { sessionId: string; branchId?: string }) => {
      if (!token) {
        throw new Error("Authentication is required.");
      }
      const sessionId = typeof input === "string" ? input : input.sessionId;
      const branchId =
        typeof input === "string" ? selectedBranchId : (input.branchId ?? selectedBranchId);
      return mobileApiFetch<{
        session: { id: string; status: string };
        payment?: OrgPaymentRecord | null;
      }>(`/payments/mock/${sessionId}/complete`, {
        method: "POST",
        token,
        ...(branchId ? { branchId } : {}),
        body: { status: "SUCCEEDED", ...(branchId ? { branchId } : {}) },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        invalidations.shop.orders(queryClient),
        invalidations.shop.all(queryClient),
        invalidations.owner.all(queryClient),
      ]);
      notifyMutationSuccess("Test payment completed.");
    },
    onError: (error) => {
      notifyMutationError(error, "Test payment could not be completed.");
    },
  });
}
