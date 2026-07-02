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
import type { PaymentReceiptState, PaymentsT } from "./payments-utils";
import { useT } from "@/lib/use-t";

function settlementOrderStatusLabel(status: string | null | undefined, t: PaymentsT) {
  if (status === "PAYMENT_PENDING" || status === "PENDING_PAYMENT") return t("statusPaymentPending");
  if (status === "PAID") return t("statusPaidPast");
  if (status === "READY_FOR_PICKUP") return t("statusReadyForPickup");
  if (status === "PICKED_UP") return t("statusPickedUp");
  if (status === "CANCELLED") return t("statusCancelled");
  if (status === "FAILED") return t("statusFailed");
  if (status === "REFUNDED") return t("statusRefunded");
  return formatEnumLabel(status ?? "order");
}

function settlementOrderNote(order: ShopOrderRow, t: PaymentsT) {
  if (order.status === "READY_FOR_PICKUP") return t("readyDeskHandover");
  if (order.status === "PENDING_PAYMENT" && !order.paymentId) return t("paymentStillNeeded");
  return "";
}

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
  const t = useT("payments");

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("settlementQueue")}
        title={t("ordersAffectingCashflow")}
        badge={
          <Pill tone={queuedOrders.length ? "amber" : "neutral"}>
            {t("unsettledCount", { count: queuedOrders.length })}
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
      <ManagedOn surface="desk" className="mt-4">
        {t("deskPickupManaged")}
      </ManagedOn>
      <div className="mt-5">
        {shopOrdersState.error ? (
          <ErrorNotice message={shopOrdersState.error} />
        ) : shopOrdersState.loading && shopOrders.length === 0 ? (
          <EmptyState title={t("loadingSettlementQueue")} />
        ) : (
          <>
            <SettlementFilters
              orderStatusFilter={orderStatusFilter}
              setOrderStatusFilter={setOrderStatusFilter}
              selectedReadyOrders={selectedReadyOrders}
              bulkBusy={bulkBusy}
              onBulkFulfillReadyOrders={onBulkFulfillReadyOrders}
              t={t}
            />
            <DataTable
              columns={[
                {
                  id: "select",
                  header: t("select"),
                  render: (order) => (
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => onToggleOrder(order.id)}
                      disabled={order.status !== "READY_FOR_PICKUP"}
                      aria-label={t("selectOrder", { order: order.id.slice(-8).toUpperCase() })}
                      className="zook-focus h-4 w-4 rounded border-white/20 bg-black/40 accent-lime-300 disabled:opacity-40"
                    />
                  ),
                },
                {
                  id: "order",
                  header: t("order"),
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
                  header: t("status"),
                  render: (order) => <StatusPill value={settlementOrderStatusLabel(order.status, t)} />,
                },
                {
                  id: "items",
                  header: t("items"),
                  align: "right",
                  render: (order) =>
                    order.items.reduce((sum, item) => sum + item.quantity, 0).toString(),
                },
                {
                  id: "notes",
                  header: t("notesColumn"),
                  render: (order) => {
                    const note = settlementOrderNote(order, t);
                    return note ? (
                      <span className="text-xs font-medium text-white/62">{note}</span>
                    ) : (
                      <span className="text-xs text-white/30">-</span>
                    );
                  },
                },
                {
                  id: "amount",
                  header: t("amount"),
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
                            t("shopPaymentRecorded", { amount: formatInr(order.totalPaise) }),
                          );
                          setLastReceipt(receipt);
                          paymentsState.reload?.();
                          shopOrdersState.reload?.();
                        }}
                      />
                    ) : (
                      <span className="text-xs text-white/30">-</span>
                    ),
                },
              ]}
              rows={filteredShopOrders}
              rowKey={(order) => order.id}
              empty={<EmptyState title={t("noShopOrders")} />}
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
  t,
}: {
  orderStatusFilter: string;
  setOrderStatusFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedReadyOrders: ShopOrderRow[];
  bulkBusy: boolean;
  onBulkFulfillReadyOrders: () => void | Promise<void>;
  t: PaymentsT;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {(
        [
          ["ALL", t("filterAll")],
          ["PENDING_PAYMENT", t("filterPendingPayment")],
          ["READY_FOR_PICKUP", t("filterReadyPickup")],
          ["FULFILLED", t("filterSettled")],
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
        title={t("settleOrdersTitle", {
          count: selectedReadyOrders.length,
          orderLabel: selectedReadyOrders.length === 1 ? t("orderOne") : t("orderOther"),
        })}
        description={t("settleDescription")}
        confirmLabel={t("settle")}
        className="zook-focus ml-auto rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
      >
        {bulkBusy
          ? t("settling")
          : selectedReadyOrders.length
            ? `${t("settle")} ${selectedReadyOrders.length}`
            : t("settle")}
      </ConfirmActionButton>
    </div>
  );
}
