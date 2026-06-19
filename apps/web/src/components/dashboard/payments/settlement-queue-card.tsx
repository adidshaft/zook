import type * as React from "react";
import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { ConfirmActionButton } from "../../confirm-action-button";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import { CsvExportButton, ErrorNotice } from "../operational-shared";
import type { ShopOrderRow } from "@/components/dashboard/types";
import type { LoadingState, PagedState } from "../read-only/types";
import { ShopOrderPaymentControl } from "./shop-order-payment-control";
import type { PaymentReceiptState } from "./payments-utils";

export function SettlementQueueCard({
  orgId,
  queuedOrders,
  shopOrders,
  filteredShopOrders,
  shopOrdersState,
  paymentsState,
  orderStatusFilter,
  setOrderStatusFilter,
  selectedOrderIds,
  selectedReadyOrders,
  bulkBusy,
  manualPaymentBusy,
  canRecordOffline,
  permissionMessage,
  onToggleOrder,
  onBulkFulfillReadyOrders,
  setManualPaymentStatus,
  setLastReceipt,
}: {
  orgId: string;
  queuedOrders: ShopOrderRow[];
  shopOrders: ShopOrderRow[];
  filteredShopOrders: ShopOrderRow[];
  shopOrdersState: LoadingState;
  paymentsState: PagedState;
  orderStatusFilter: string;
  setOrderStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedOrderIds: string[];
  selectedReadyOrders: ShopOrderRow[];
  bulkBusy: boolean;
  manualPaymentBusy: boolean;
  canRecordOffline: boolean;
  permissionMessage: string;
  onToggleOrder: (orderId: string) => void;
  onBulkFulfillReadyOrders: () => void | Promise<void>;
  setManualPaymentStatus: React.Dispatch<React.SetStateAction<string>>;
  setLastReceipt: React.Dispatch<React.SetStateAction<PaymentReceiptState | null>>;
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Settlement Queue"
        title="Orders affecting cashflow"
        description="Review orders waiting for payment or pickup."
        badge={
          <Pill tone={queuedOrders.length ? "amber" : "neutral"}>
            {queuedOrders.length} unsettled
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
      <ManagedOn surface="desk" className="mt-4">
        Pickup is completed in Desk after identity verification.
      </ManagedOn>
      <div className="mt-5">
        {shopOrdersState.error ? (
          <ErrorNotice message={shopOrdersState.error} />
        ) : shopOrdersState.loading && shopOrders.length === 0 ? (
          <EmptyState
            title="Loading settlement queue"
            description="Loading shop order payments."
          />
        ) : (
          <>
            <SettlementFilters
              orderStatusFilter={orderStatusFilter}
              setOrderStatusFilter={setOrderStatusFilter}
              selectedReadyOrders={selectedReadyOrders}
              bulkBusy={bulkBusy}
              onBulkFulfillReadyOrders={onBulkFulfillReadyOrders}
            />
            <DataTable
              columns={[
                {
                  id: "select",
                  header: "Select",
                  render: (order) => (
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => onToggleOrder(order.id)}
                      disabled={order.status !== "READY_FOR_PICKUP"}
                      aria-label={`Select order ${order.id.slice(-8).toUpperCase()}`}
                      className="zook-focus h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300 disabled:opacity-40"
                    />
                  ),
                },
                {
                  id: "order",
                  header: "Order",
                  render: (order) => (
                    <div>
                      <p className="font-medium text-white">{order.id.slice(-8).toUpperCase()}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                  ),
                },
                {
                  id: "status",
                  header: "Status",
                  render: (order) => <StatusPill value={formatEnumLabel(order.status)} />,
                },
                {
                  id: "items",
                  header: "Items",
                  align: "right",
                  render: (order) =>
                    order.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
                },
                {
                  id: "notes",
                  header: "Notes",
                  render: (order) =>
                    order.status === "READY_FOR_PICKUP"
                      ? "Ready for desk handover"
                      : order.status === "PENDING_PAYMENT"
                        ? "Payment still needed"
                        : "No desk note",
                },
                {
                  id: "amount",
                  header: "Amount",
                  align: "right",
                  render: (order) => (
                    <span className="font-medium text-white">{formatInr(order.totalPaise)}</span>
                  ),
                },
                {
                  id: "actions",
                  header: "",
                  align: "right",
                  render: (order) =>
                    order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                      <ShopOrderPaymentControl
                        orgId={orgId}
                        order={order}
                        disabled={manualPaymentBusy || !canRecordOffline}
                        disabledTitle={!canRecordOffline ? permissionMessage : undefined}
                        onRecorded={(receipt) => {
                          setManualPaymentStatus(
                            `Shop payment recorded for ${formatInr(order.totalPaise)}.`,
                          );
                          setLastReceipt(receipt);
                          paymentsState.reload?.();
                          shopOrdersState.reload?.();
                        }}
                      />
                    ) : (
                      <span className="text-xs text-white/35">Settled</span>
                    ),
                },
              ]}
              rows={filteredShopOrders}
              rowKey={(order) => order.id}
              empty={
                <EmptyState
                  title="No shop orders in this view"
                  description="No payment or pickup follow-up needed."
                />
              }
            />
          </>
        )}
      </div>
    </GlassCard>
  );
}

function SettlementFilters({
  orderStatusFilter,
  setOrderStatusFilter,
  selectedReadyOrders,
  bulkBusy,
  onBulkFulfillReadyOrders,
}: {
  orderStatusFilter: string;
  setOrderStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedReadyOrders: ShopOrderRow[];
  bulkBusy: boolean;
  onBulkFulfillReadyOrders: () => void | Promise<void>;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {(
        [
          ["ALL", "All"],
          ["PENDING_PAYMENT", "Pending Payment"],
          ["READY_FOR_PICKUP", "Ready for Pickup"],
          ["FULFILLED", "Settled"],
        ] as Array<[string, string]>
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setOrderStatusFilter(value)}
          className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            orderStatusFilter === value
              ? "border-white/20 bg-white/8 text-white"
              : "border-white/10 text-white/55 hover:bg-white/8"
          }`}
        >
          {label}
        </button>
      ))}
      <ConfirmActionButton
        disabled={!selectedReadyOrders.length || bulkBusy}
        onConfirm={() => onBulkFulfillReadyOrders()}
        title={`Settle ${selectedReadyOrders.length} ${
          selectedReadyOrders.length === 1 ? "order" : "orders"
        }?`}
        description="Each order is marked as fulfilled without a pickup code. This action is logged."
        confirmLabel="Settle"
        className="zook-focus ml-auto rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
      >
        {bulkBusy ? "Settling..." : `Settle ${selectedReadyOrders.length || ""}`.trim()}
      </ConfirmActionButton>
    </div>
  );
}
