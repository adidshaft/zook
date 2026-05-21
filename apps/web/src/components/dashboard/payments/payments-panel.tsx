"use client";

import { useState } from "react";
import type * as React from "react";
import { formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import type { PaymentRow } from "../../dashboard-operational-model";
import { PaymentHistoryCard } from "./payment-history-card";
import { PaymentMetricCards } from "./payment-metric-cards";
import { PaymentReconciliationCard } from "./payment-reconciliation-card";
import { OfflinePaymentCard } from "./offline-payment-card";
import { RevenueOpportunitiesCard } from "./revenue-opportunities-card";
import { SettlementQueueCard } from "./settlement-queue-card";
import type { PaymentReceiptState } from "./payments-utils";
import type { ManualPaymentForm, PaymentDocumentKind, PaymentsPanelProps } from "./types";

export function PaymentsPanel({
  orgId,
  summary,
  queuedOrders,
  membershipPlans,
  members,
  payments,
  paymentsState,
  shopOrders,
  shopOrdersState,
  permissions = [],
}: PaymentsPanelProps) {
  const canRecordOffline = permissions.includes("PAYMENTS_RECORD_OFFLINE");
  const permissionMessage = "This action requires Owner or Admin access.";
  const [manualPayment, setManualPayment] = useState<ManualPaymentForm>({
    memberUserId: "",
    planId: "",
    amountRupees: "",
    mode: "CASH",
    proofAssetId: "",
    receiptNumber: "",
    notes: "",
  });
  const [manualPaymentStatus, setManualPaymentStatus] = useState("");
  const [manualPaymentBusy, setManualPaymentBusy] = useState(false);
  const [documentBusyId, setDocumentBusyId] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PaymentReceiptState | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filteredShopOrders = shopOrders.filter((order) =>
    orderStatusFilter === "ALL" ? true : order.status === orderStatusFilter,
  );
  const selectedReadyOrders = filteredShopOrders.filter(
    (order) => selectedOrderIds.includes(order.id) && order.status === "READY_FOR_PICKUP",
  );
  const succeededPayments = payments.filter((payment) =>
    ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status),
  );
  const failedPayments = payments.filter((payment) =>
    ["FAILED", "CANCELLED", "REJECTED"].includes(payment.status),
  );
  const pendingPayments = payments.filter((payment) =>
    ["CREATED", "PENDING", "PENDING_PAYMENT", "PROCESSING"].includes(payment.status),
  );
  const documentReadyPayments = succeededPayments.filter(
    (payment) => !payment.receiptNumber && !payment.refundedAmountPaise,
  );

  function toggleOrder(orderId: string) {
    setSelectedOrderIds((current) =>
      current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId],
    );
  }

  async function bulkFulfillReadyOrders() {
    try {
      setBulkBusy(true);
      setManualPaymentStatus("");
      await Promise.all(
        selectedReadyOrders.map((order) =>
          webApiFetch(`/api/orgs/${orgId}/shop/orders/${order.id}/fulfill`, {
            method: "POST",
            body: {
              pickupCodeSkipped: true,
              skipReason: "Bulk settled from owner payment queue after desk verification.",
            },
            feedback: { success: false, error: "Unable to settle selected orders." },
          }),
        ),
      );
      setManualPaymentStatus(`${selectedReadyOrders.length} ready orders settled.`);
      setSelectedOrderIds([]);
      shopOrdersState.reload?.();
    } catch (cause) {
      setManualPaymentStatus(cause instanceof Error ? cause.message : "Unable to settle orders.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function recordOfflinePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setManualPaymentBusy(true);
      setManualPaymentStatus("");
      const amountPaise = Math.round(Number(manualPayment.amountRupees) * 100);
      const payload = await webApiFetch<{ payment?: PaymentRow }>(
        `/api/orgs/${orgId}/manual-payments`,
        {
          method: "POST",
          feedback: { success: "Payment recorded.", error: "Unable to record payment." },
          body: {
            memberUserId: manualPayment.memberUserId,
            planId: manualPayment.planId,
            amountPaise,
            mode: manualPayment.mode,
            proofAssetId: manualPayment.proofAssetId || undefined,
            receiptNumber: manualPayment.receiptNumber || undefined,
            notes: manualPayment.notes || undefined,
          },
        },
      );
      setManualPaymentStatus(`Payment recorded for ${formatInr(amountPaise)}.`);
      setLastReceipt({
        title: "Membership payment",
        amountPaise,
        mode: manualPayment.mode,
        reference: manualPayment.receiptNumber || payload.payment?.receiptNumber || undefined,
        recordedAt: new Date().toISOString(),
      });
      setManualPayment((current) => ({ ...current, receiptNumber: "", notes: "" }));
      paymentsState.reload?.();
    } catch (cause) {
      setManualPaymentStatus(cause instanceof Error ? cause.message : "Unable to record payment.");
    } finally {
      setManualPaymentBusy(false);
    }
  }

  async function generatePaymentDocument(payment: PaymentRow, kind: PaymentDocumentKind) {
    if (!payment.orgId) {
      setManualPaymentStatus("This payment is missing its gym link.");
      return;
    }
    try {
      setDocumentBusyId(`${kind}:${payment.id}`);
      setManualPaymentStatus("");
      const payload = await webApiFetch<{ receiptUrl?: string; invoiceUrl?: string }>(
        `/api/orgs/${payment.orgId}/payments/${payment.id}/${kind}`,
        {
          method: "POST",
          feedback: {
            success: kind === "receipt" ? "Receipt generated." : "Invoice generated.",
          },
        },
      );
      paymentsState.reload?.();
      const url = kind === "receipt" ? payload.receiptUrl : payload.invoiceUrl;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setManualPaymentStatus(kind === "receipt" ? "Receipt generated." : "Invoice generated.");
    } catch (cause) {
      setManualPaymentStatus(
        cause instanceof Error ? cause.message : `Unable to generate ${kind}.`,
      );
    } finally {
      setDocumentBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <PaymentMetricCards summary={summary} queuedOrders={queuedOrders} />
      <PaymentReconciliationCard
        orgId={orgId}
        summary={summary}
        succeededPayments={succeededPayments}
        failedPayments={failedPayments}
        pendingPayments={pendingPayments}
        documentReadyPayments={documentReadyPayments}
      />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <PaymentHistoryCard
          orgId={orgId}
          payments={payments}
          paymentsState={paymentsState}
          manualPaymentStatus={manualPaymentStatus}
          documentBusyId={documentBusyId}
          onGenerateDocument={(payment, kind) => void generatePaymentDocument(payment, kind)}
        />
        <OfflinePaymentCard
          orgId={orgId}
          membershipPlans={membershipPlans}
          members={members}
          manualPayment={manualPayment}
          setManualPayment={setManualPayment}
          manualPaymentStatus={manualPaymentStatus}
          manualPaymentBusy={manualPaymentBusy}
          canRecordOffline={canRecordOffline}
          permissionMessage={permissionMessage}
          lastReceipt={lastReceipt}
          onRecordOfflinePayment={(event) => void recordOfflinePayment(event)}
        />
        <SettlementQueueCard
          orgId={orgId}
          queuedOrders={queuedOrders}
          shopOrders={shopOrders}
          filteredShopOrders={filteredShopOrders}
          shopOrdersState={shopOrdersState}
          paymentsState={paymentsState}
          orderStatusFilter={orderStatusFilter}
          setOrderStatusFilter={setOrderStatusFilter}
          selectedOrderIds={selectedOrderIds}
          selectedReadyOrders={selectedReadyOrders}
          bulkBusy={bulkBusy}
          manualPaymentBusy={manualPaymentBusy}
          canRecordOffline={canRecordOffline}
          permissionMessage={permissionMessage}
          onToggleOrder={toggleOrder}
          onBulkFulfillReadyOrders={bulkFulfillReadyOrders}
          setManualPaymentStatus={setManualPaymentStatus}
          setLastReceipt={setLastReceipt}
        />
        <RevenueOpportunitiesCard summary={summary} membershipPlans={membershipPlans} />
      </div>
    </div>
  );
}
