"use client";

import { useState } from "react";
import type * as React from "react";
import { formatInr } from "@/lib/format";
import { webApiFetch } from "@/lib/api-client";
import { getRupeeAmountError, normalizeRupeeInput } from "@/lib/payment-amount";
import type { PaymentRow } from "@/components/dashboard/types";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { PaymentHistoryCard } from "./payment-history-card";
import { PaymentMetricCards } from "./payment-metric-cards";
import { PaymentReconciliationCard } from "./payment-reconciliation-card";
import { OfflinePaymentCard } from "./offline-payment-card";
import { RevenueOpportunitiesCard } from "./revenue-opportunities-card";
import { SettlementQueueCard } from "./settlement-queue-card";
import type { PaymentReceiptState } from "./payments-utils";
import type { ManualPaymentForm, PaymentDocumentKind, PaymentsPanelProps } from "./types";

type RefundDraft = {
  payment: PaymentRow;
  amountRupees: string;
  reason: string;
};

type PaymentWorkspaceTab = "review" | "history" | "record" | "growth";

const paymentWorkspaceTabs: Array<{
  id: PaymentWorkspaceTab;
  label: string;
  meta: (input: {
    reviewCount: number;
    paymentCount: number;
    expiringMemberships: number;
  }) => string;
}> = [
  {
    id: "review",
    label: "Review",
    meta: ({ reviewCount }) => (reviewCount ? `${reviewCount} need check` : "Clean close"),
  },
  { id: "history", label: "History", meta: ({ paymentCount }) => `${paymentCount} records` },
  { id: "record", label: "Record", meta: () => "Cash, UPI, card" },
  {
    id: "growth",
    label: "Growth",
    meta: ({ expiringMemberships }) => `${expiringMemberships} renewals`,
  },
];

function refundedAmountFor(payment: PaymentRow) {
  return payment.refundedAmountPaise ?? 0;
}

function remainingRefundAmount(payment: PaymentRow) {
  return Math.max(payment.amountPaise - refundedAmountFor(payment), 0);
}

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
  const [refundBusyId, setRefundBusyId] = useState<string | null>(null);
  const [refundDraft, setRefundDraft] = useState<RefundDraft | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PaymentReceiptState | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentWorkspaceTab>("review");
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
  const reviewCount = failedPayments.length + pendingPayments.length;
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
      setManualPaymentStatus(`${selectedReadyOrders.length} pickup orders settled.`);
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
      const amountError = getRupeeAmountError(manualPayment.amountRupees);
      if (amountError) {
        setManualPaymentStatus(amountError);
        return;
      }
      const amountPaise = Math.round(Number(normalizeRupeeInput(manualPayment.amountRupees)) * 100);
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

  function openRefundDraft(payment: PaymentRow) {
    if (!payment.orgId) {
      setManualPaymentStatus("This payment is missing its gym link.");
      return;
    }
    const remainingPaise = remainingRefundAmount(payment);
    setManualPaymentStatus("");
    setRefundDraft({
      payment,
      amountRupees: (remainingPaise / 100).toFixed(2),
      reason: "Duplicate payment",
    });
  }

  async function submitRefundDraft() {
    if (!refundDraft) return;
    const { payment, amountRupees, reason } = refundDraft;
    const remainingPaise = remainingRefundAmount(payment);
    const amountError = getRupeeAmountError(amountRupees);
    if (amountError) {
      setManualPaymentStatus(amountError);
      return;
    }
    if (!reason.trim()) {
      setManualPaymentStatus("Add a refund reason before submitting.");
      return;
    }
    const amountPaise = Math.round(Number(normalizeRupeeInput(amountRupees)) * 100);
    if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > remainingPaise) {
      setManualPaymentStatus(`Enter an amount between Rs. 1 and Rs. ${(remainingPaise / 100).toFixed(2)}.`);
      return;
    }
    try {
      setRefundBusyId(payment.id);
      setManualPaymentStatus("");
      await webApiFetch(`/api/orgs/${payment.orgId}/payments/${payment.id}/refund`, {
        method: "POST",
        body: { amountPaise, reason: reason.trim() },
        feedback: { success: "Refund submitted.", error: "Unable to refund payment." },
      });
      paymentsState.reload?.();
      setRefundDraft(null);
      setManualPaymentStatus("Refund submitted from payment history.");
    } catch (cause) {
      setManualPaymentStatus(cause instanceof Error ? cause.message : "Unable to refund payment.");
    } finally {
      setRefundBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <PaymentMetricCards summary={summary} queuedOrders={queuedOrders} />
      {refundDraft ? (
        <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)]/82 p-4 shadow-[var(--shadow-md)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Refund draft
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                {refundDraft.payment.user?.name ?? refundDraft.payment.user?.email ?? "Payment"} ·{" "}
                {formatInr(remainingRefundAmount(refundDraft.payment))} refundable
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Confirming sends an irreversible refund request when this payment supports automatic refunds.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRefundDraft(null)}
              className="zook-focus rounded-full border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[0.6fr_1fr_auto]">
            <label className="grid gap-1 text-sm font-medium text-[var(--text-primary)]">
              Refund amount
              <input
                value={refundDraft.amountRupees}
                inputMode="decimal"
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, amountRupees: event.target.value } : current,
                  )
                }
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-[var(--text-primary)]">
              Refund reason
              <input
                value={refundDraft.reason}
                onChange={(event) =>
                  setRefundDraft((current) =>
                    current ? { ...current, reason: event.target.value } : current,
                  )
                }
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <ConfirmActionButton
              className="zook-focus self-end rounded-full border border-[color-mix(in_srgb,var(--feedback-danger)_38%,transparent)] bg-[var(--surface-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--feedback-danger)] disabled:cursor-not-allowed disabled:opacity-60"
              title={`Refund ${refundDraft.amountRupees.trim() ? `₹${refundDraft.amountRupees.trim()}` : "this payment"}?`}
              description={`This will submit a refund for ${refundDraft.payment.user?.name ?? refundDraft.payment.user?.email ?? "this payment"}. Refund requests cannot be undone from the dashboard.`}
              confirmLabel="Submit refund"
              confirmTone="danger"
              onConfirm={() => submitRefundDraft()}
              disabled={refundBusyId === refundDraft.payment.id}
            >
              {refundBusyId === refundDraft.payment.id ? "Submitting..." : "Submit refund"}
            </ConfirmActionButton>
          </div>
        </section>
      ) : null}

      <div className="rounded-[26px] border border-white/10 bg-black/20 p-2">
        <div className="grid gap-2 sm:grid-cols-4" role="tablist" aria-label="Payment workspace">
          {paymentWorkspaceTabs.map((tab) => {
            const selected = activeTab === tab.id;
            const meta = tab.meta({
              reviewCount,
              paymentCount: payments.length,
              expiringMemberships: summary.expiringMemberships,
            });
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`payments-${tab.id}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={`zook-focus rounded-[20px] px-4 py-3 text-left transition ${
                  selected
                    ? "bg-white text-black shadow-[0_18px_44px_rgba(0,0,0,0.22)]"
                    : "text-white/62 hover:bg-white/8 hover:text-white"
                }`}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span
                  className={`mt-0.5 block truncate text-xs ${
                    selected ? "text-black/55" : "text-white/38"
                  }`}
                >
                  {meta}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "review" ? (
        <div id="payments-review-panel" role="tabpanel" className="grid gap-4">
          <PaymentReconciliationCard
            orgId={orgId}
            summary={summary}
            succeededPayments={succeededPayments}
            failedPayments={failedPayments}
            pendingPayments={pendingPayments}
            documentReadyPayments={documentReadyPayments}
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
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div id="payments-history-panel" role="tabpanel">
          <PaymentHistoryCard
            orgId={orgId}
            payments={payments}
            paymentsState={paymentsState}
            manualPaymentStatus={manualPaymentStatus}
            documentBusyId={documentBusyId}
            onGenerateDocument={(payment, kind) => void generatePaymentDocument(payment, kind)}
            refundBusyId={refundBusyId}
            onRefundPayment={openRefundDraft}
          />
        </div>
      ) : null}

      {activeTab === "record" ? (
        <div id="payments-record-panel" role="tabpanel">
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
        </div>
      ) : null}

      {activeTab === "growth" ? (
        <div id="payments-growth-panel" role="tabpanel">
          <RevenueOpportunitiesCard summary={summary} membershipPlans={membershipPlans} />
        </div>
      ) : null}
    </div>
  );
}
