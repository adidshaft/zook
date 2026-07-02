"use client";

import { useState } from "react";
import { FileText, MoreHorizontal, RotateCcw } from "lucide-react";
import { formatDateTime, formatInr } from "@/lib/format";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { PaymentRow } from "@/components/dashboard/types";
import type { PagedState } from "../read-only/types";
import { formatPaymentMode, formatPaymentPurpose, formatPaymentStatus } from "./payments-utils";
import type { PaymentDocumentKind } from "./types";
import { useT } from "@/lib/use-t";

function paymentStatusTone(status: string) {
  if (status === "SUCCEEDED") return "lime" as const;
  if (["CREATED", "PENDING", "PENDING_PAYMENT", "PROCESSING", "REQUIRES_ACTION"].includes(status)) {
    return "amber" as const;
  }
  if (["FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(status)) {
    return "red" as const;
  }
  return "neutral" as const;
}

function paymentStatusMark(status: string) {
  if (status === "SUCCEEDED") return "✓";
  if (["CREATED", "PENDING", "PENDING_PAYMENT", "PROCESSING", "REQUIRES_ACTION"].includes(status)) return "…";
  if (["FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(status)) return "!";
  return "•";
}

function statusMarkClass(tone: ReturnType<typeof paymentStatusTone>) {
  if (tone === "lime") return "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]";
  if (tone === "amber") return "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]";
  if (tone === "red") return "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]";
  return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]";
}

function PaymentStatusMark({ status }: { status: string }) {
  const t = useT("payments");
  const label = formatPaymentStatus(status, t);
  const tone = paymentStatusTone(status);
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${statusMarkClass(tone)}`}
    >
      <span aria-hidden>{paymentStatusMark(status)}</span>
    </span>
  );
}

export function PaymentHistoryCard({
  orgId,
  payments,
  paymentsState,
  manualPaymentStatus,
  documentBusyId,
  onGenerateDocument,
  refundBusyId,
  onRefundPayment,
}: {
  orgId: string;
  payments: PaymentRow[];
  paymentsState: PagedState;
  manualPaymentStatus: string;
  documentBusyId: string | null;
  onGenerateDocument: (payment: PaymentRow, kind: PaymentDocumentKind) => void;
  refundBusyId?: string | null;
  onRefundPayment?: (payment: PaymentRow) => void;
}) {
  const t = useT("payments");
  const [documentKindByPaymentId, setDocumentKindByPaymentId] = useState<
    Record<string, PaymentDocumentKind>
  >({});
  const [expandedPaymentId, setExpandedPaymentId] = useState("");

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("paymentsEyebrow")}
        title={t("paymentHistory")}
        badge={
          <Pill>
            {payments.length === 1
              ? t("paymentCount", { count: payments.length })
              : t("paymentCountPlural", { count: payments.length })}
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/payments.csv`} />}
      />
      <div className="mt-5">
        {manualPaymentStatus ? (
          <p className="mb-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
            {manualPaymentStatus}
          </p>
        ) : null}
        {paymentsState.error ? (
          <ErrorNotice message={paymentsState.error} />
        ) : paymentsState.loading && payments.length === 0 ? (
          <EmptyState title={t("loadingPayments")} />
        ) : (
          <>
            <DataTable
              columns={[
                {
                  id: "member",
                  header: t("member"),
                  render: (payment) => (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {payment.user?.name ?? payment.user?.email ?? t("walkInSystem")}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatPaymentPurpose(payment.purpose, t)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: t("status"),
                  render: (payment) => (
                    <div className="flex items-center gap-2" title={formatPaymentStatus(payment.status, t)}>
                      <PaymentStatusMark status={payment.status} />
                      <span className="hidden text-xs text-white/45 sm:inline">
                        {formatPaymentStatus(payment.status, t)}
                      </span>
                    </div>
                  ),
                },
                {
                  id: "mode",
                  header: t("mode"),
                  render: (payment) => formatPaymentMode(payment.mode, t),
                },
                {
                  id: "recorded",
                  header: t("recorded"),
                  render: (payment) => formatDateTime(payment.recordedAt ?? payment.createdAt),
                },
                {
                  id: "amount",
                  header: t("amount"),
                  align: "right",
                  render: (payment) => (
                    <span className="font-medium text-white">{formatInr(payment.amountPaise)}</span>
                  ),
                },
                {
                  id: "documents",
                  header: t("actions"),
                  align: "right",
                  render: (payment) => {
                    const selectedDocumentKind = documentKindByPaymentId[payment.id] ?? "invoice";
                    const documentBusyKey = `${selectedDocumentKind}:${payment.id}`;
                    const documentBusy = documentBusyId === documentBusyKey;
                    const receiptBusy = documentBusyId === `receipt:${payment.id}`;
                    const expanded = expandedPaymentId === payment.id;
                    const refundable =
                      onRefundPayment &&
                      ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(payment.status) &&
                      (payment.refundedAmountPaise ?? 0) < payment.amountPaise;

                    return (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <ZookButton
                            type="button"
                            tone="ghost"
                            size="sm"
                            onClick={() => onGenerateDocument(payment, "receipt")}
                            disabled={receiptBusy}
                            state={receiptBusy ? "loading" : "idle"}
                          >
                            <FileText aria-hidden className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              {receiptBusy ? t("making") : t("receipt")}
                            </span>
                          </ZookButton>
                          <button
                            type="button"
                            aria-label={t("moreActionsFor", { name: payment.user?.name ?? payment.id })}
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedPaymentId((current) =>
                                current === payment.id ? "" : payment.id,
                              )
                            }
                            className="zook-focus inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                          >
                            <MoreHorizontal aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
                        {expanded ? (
                          <div className="flex flex-wrap justify-end gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-sunken)] p-2">
                            {refundable ? (
                              <button
                                type="button"
                                onClick={() => onRefundPayment(payment)}
                                disabled={refundBusyId === payment.id}
                                className="zook-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--feedback-danger)] transition hover:bg-[var(--surface-danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                                {refundBusyId === payment.id ? t("refunding") : t("refund")}
                              </button>
                            ) : null}
                            <select
                              value={selectedDocumentKind}
                              aria-label={t("documentTypeFor", { name: payment.user?.name ?? payment.id })}
                              onChange={(event) =>
                                setDocumentKindByPaymentId((current) => ({
                                  ...current,
                                  [payment.id]: event.target.value as PaymentDocumentKind,
                                }))
                              }
                              className="zook-focus min-h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)]"
                            >
                              <option value="receipt">{t("receipt")}</option>
                              <option value="invoice">{t("invoice")}</option>
                            </select>
                            <ZookButton
                              type="button"
                              tone="ghost"
                              size="sm"
                              onClick={() => onGenerateDocument(payment, selectedDocumentKind)}
                              disabled={documentBusy}
                              state={documentBusy ? "loading" : "idle"}
                            >
                              {documentBusy ? t("making") : t("generate")}
                            </ZookButton>
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
              rows={payments}
              rowKey={(payment) => payment.id}
              empty={<EmptyState title={t("noPayments")} />}
            />
            <LoadMoreButton
              count={payments.length}
              hasMore={paymentsState.hasMore}
              loading={paymentsState.loadingMore}
              onLoadMore={paymentsState.loadMore}
            />
          </>
        )}
      </div>
    </GlassCard>
  );
}
