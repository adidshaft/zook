import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ZookButton } from "../../zook-button";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { PaymentRow } from "@/components/dashboard/types";
import type { PagedState } from "../read-only/types";
import { formatPaymentMode } from "./payments-utils";
import type { PaymentDocumentKind } from "./types";

export function PaymentHistoryCard({
  orgId,
  payments,
  paymentsState,
  manualPaymentStatus,
  documentBusyId,
  onGenerateDocument,
}: {
  orgId: string;
  payments: PaymentRow[];
  paymentsState: PagedState;
  manualPaymentStatus: string;
  documentBusyId: string | null;
  onGenerateDocument: (payment: PaymentRow, kind: PaymentDocumentKind) => void;
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Payments"
        title="Payment history"
        description="Membership, shop, online, and desk payments are shown here."
        badge={<Pill tone="blue">{payments.length} loaded</Pill>}
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
          <EmptyState title="Loading payments" description="Pulling recent payment records." />
        ) : (
          <>
            <DataTable
              columns={[
                {
                  id: "member",
                  header: "Member",
                  render: (payment) => (
                    <div>
                      <p className="font-medium text-white">
                        {payment.user?.name ?? payment.user?.email ?? "Walk-in or system"}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatEnumLabel(payment.purpose)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (payment) => <StatusPill value={formatEnumLabel(payment.status)} />,
                },
                {
                  id: "mode",
                  header: "Mode",
                  render: (payment) => formatPaymentMode(payment.mode),
                },
                {
                  id: "recorded",
                  header: "Recorded",
                  render: (payment) => formatDateTime(payment.recordedAt ?? payment.createdAt),
                },
                {
                  id: "amount",
                  header: "Amount",
                  align: "right",
                  render: (payment) => (
                    <span className="font-medium text-white">
                      {formatInr(payment.amountPaise)}
                    </span>
                  ),
                },
                {
                  id: "documents",
                  header: "Documents",
                  align: "right",
                  render: (payment) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => onGenerateDocument(payment, "receipt")}
                        disabled={documentBusyId === `receipt:${payment.id}`}
                        state={documentBusyId === `receipt:${payment.id}` ? "loading" : "idle"}
                      >
                        {documentBusyId === `receipt:${payment.id}` ? "Making..." : "Receipt"}
                      </ZookButton>
                      <ZookButton
                        type="button"
                        tone="ghost"
                        size="sm"
                        onClick={() => onGenerateDocument(payment, "invoice")}
                        disabled={documentBusyId === `invoice:${payment.id}`}
                        state={documentBusyId === `invoice:${payment.id}` ? "loading" : "idle"}
                      >
                        {documentBusyId === `invoice:${payment.id}` ? "Making..." : "Invoice"}
                      </ZookButton>
                    </div>
                  ),
                },
              ]}
              rows={payments}
              rowKey={(payment) => payment.id}
              empty={
                <EmptyState
                  title="No payments yet"
                  description="Payments appear here when members buy memberships or shop pickups."
                />
              }
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
