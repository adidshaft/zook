"use client";

import { useState } from "react";
import type * as React from "react";
import { DataTable, EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { HelpHint, ManagedOn, SearchableSelect } from "../../ui";
import { formatCompactNumber, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import type {
  MembershipPlanRow,
  PaymentRow,
  MemberRow,
  ShopOrderRow,
  OrganizationSummary,
} from "../../dashboard-operational-model";
import type { Permission } from "@zook/core";
import { webApiFetch } from "@/lib/api-client";
import { CsvExportButton, ErrorNotice, LoadMoreButton } from "../operational-shared";
import type { LoadingState, PagedState } from "./types";
import { formatPaymentMode, modeOptions, type PaymentReceiptState } from "./payments-utils";
import { PaymentProofUpload } from "../../payment-proof-upload";
import { ShopOrderPaymentControl } from "./shop-order-payment-control";

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
}: {
  orgId: string;
  summary: OrganizationSummary;
  queuedOrders: ShopOrderRow[];
  membershipPlans: MembershipPlanRow[];
  members: MemberRow[];
  payments: PaymentRow[];
  paymentsState: PagedState;
  shopOrders: ShopOrderRow[];
  shopOrdersState: LoadingState;
  permissions?: Permission[];
}) {
  const canRecordOffline = permissions.includes("PAYMENTS_RECORD_OFFLINE");
  const permissionMessage = "This action requires Owner or Admin access.";
  const [manualPayment, setManualPayment] = useState({
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
      const payload = await webApiFetch<{ payment?: PaymentRow }>(`/api/orgs/${orgId}/manual-payments`, {
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
      });
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

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Collected at the desk</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatInr(summary.cashCollectedPaise)}
          </div>
          <p className="mt-2 text-xs text-white/55">Cash, UPI, card, and bank transfers recorded today.</p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Successful revenue</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatInr(summary.revenuePaise)}
          </div>
          <p className="mt-2 text-xs text-white/55">Current settled revenue signal for today.</p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Pending shop payments</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatCompactNumber(queuedOrders.length)}
          </div>
          <p className="mt-2 text-xs text-white/55">
            Orders waiting for payment or pickup.
          </p>
        </GlassCard>
        <GlassCard variant="strong">
          <p className="text-sm text-white/48">Expiring memberships</p>
          <div className="metric mt-3 text-4xl font-semibold text-white">
            {formatCompactNumber(summary.expiringMemberships)}
          </div>
          <p className="mt-2 text-xs text-white/55">A useful renewal queue for the front desk.</p>
        </GlassCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard>
          <SectionHeader
            eyebrow="Payments"
            title="Payments ledger"
            description="Membership, shop, online, and desk payments are shown in this gym's ledger."
            badge={<Pill tone="blue">{payments.length} loaded</Pill>}
            action={<CsvExportButton href={`/api/orgs/${orgId}/reports/payments.csv`} />}
          />
          <div className="mt-5">
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

        <GlassCard>
          <SectionHeader
            eyebrow="Record offline payment"
            title="Collected at the desk"
            description={
              <span className="inline-flex items-center gap-2">
                Use this for cash, UPI, card, or bank transfer membership payments.
                <HelpHint label="Payment mode" title="Payment mode">
                  UPI is a direct bank transfer via PhonePe or GPay. Cash and Card are recorded for
                  reconciliation. Bank Transfer may settle in one to two days.
                </HelpHint>
              </span>
            }
          />
          <form className="mt-5 grid gap-3" onSubmit={(event) => void recordOfflinePayment(event)}>
            <SearchableSelect
              label="Choose member"
              placeholder="Choose member"
              searchPlaceholder="Search members"
              value={manualPayment.memberUserId}
              onChange={(memberUserId) =>
                setManualPayment((current) => ({ ...current, memberUserId }))
              }
              options={members
                .filter((member) => member.user?.id)
                .map((member) => ({
                  value: member.user!.id,
                  label: member.user?.name ?? member.user?.email ?? "Member",
                  description: member.user?.phone ?? member.user?.email ?? undefined,
                }))}
            />
            <SearchableSelect
              label="Choose plan"
              placeholder="Choose plan"
              searchPlaceholder="Search plans"
              value={manualPayment.planId}
              onChange={(planId) => {
                const plan = membershipPlans.find((candidate) => candidate.id === planId);
                setManualPayment((current) => ({
                  ...current,
                  planId,
                  amountRupees: plan ? String(plan.pricePaise / 100) : current.amountRupees,
                }));
              }}
              options={membershipPlans
                .filter((plan) => plan.active)
                .map((plan) => ({
                  value: plan.id,
                  label: plan.name,
                  description: formatInr(plan.pricePaise),
                }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={manualPayment.amountRupees}
                onChange={(event) =>
                  setManualPayment((current) => ({ ...current, amountRupees: event.target.value }))
                }
                inputMode="decimal"
                placeholder="Amount"
                className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
                required
              />
              <select
                value={manualPayment.mode}
                onChange={(event) =>
                  setManualPayment((current) => ({ ...current, mode: event.target.value }))
                }
                className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
              >
                {modeOptions.map((mode) => (
                  <option key={mode} value={mode} className="bg-black">
                    {formatPaymentMode(mode)}
                  </option>
                ))}
              </select>
            </div>
            <PaymentProofUpload
              orgId={orgId}
              value={manualPayment.proofAssetId}
              onChange={(proofAssetId) =>
                setManualPayment((current) => ({ ...current, proofAssetId }))
              }
            />
            <input
              value={manualPayment.receiptNumber}
              onChange={(event) =>
                setManualPayment((current) => ({ ...current, receiptNumber: event.target.value }))
              }
              placeholder="Reference number"
              className="zook-focus min-h-11 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white"
            />
            <textarea
              value={manualPayment.notes}
              onChange={(event) =>
                setManualPayment((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Notes"
              className="zook-focus min-h-24 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
            <button
              type="submit"
              disabled={manualPaymentBusy || !canRecordOffline}
              title={!canRecordOffline ? permissionMessage : undefined}
              className="zook-focus min-h-11 rounded-full bg-lime-300 px-5 text-sm font-semibold text-black disabled:opacity-50"
            >
              {manualPaymentBusy ? "Recording..." : "Record payment"}
            </button>
            {manualPaymentStatus ? (
              <p className="text-sm text-white/58">{manualPaymentStatus}</p>
            ) : null}
          </form>
          {lastReceipt ? (
            <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-lime-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/70">
                Receipt ready
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{lastReceipt.title}</p>
              <div className="mt-3 grid gap-2 text-sm text-white/65">
                <p>Amount: {formatInr(lastReceipt.amountPaise)}</p>
                <p>Mode: {formatPaymentMode(lastReceipt.mode)}</p>
                <p>Reference: {lastReceipt.reference || "Not added"}</p>
                <p>Recorded: {formatDateTime(lastReceipt.recordedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="zook-focus mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72 transition hover:bg-white/8"
              >
                Print receipt
              </button>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Settlement Queue"
            title="Orders affecting cashflow"
            description="Orders waiting for payment or pickup appear here."
            badge={
              <Pill tone={queuedOrders.length ? "amber" : "lime"}>
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
                description="Pulling live shop order payment states."
              />
            ) : (
              <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {([
                  ["ALL", "All"],
                  ["PENDING_PAYMENT", "Pending Payment"],
                  ["READY_FOR_PICKUP", "Ready for Pickup"],
                  ["FULFILLED", "Settled"],
                ] as Array<[string, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOrderStatusFilter(value)}
                    className={`zook-focus rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      orderStatusFilter === value
                        ? "border-lime-300/45 bg-lime-300/12 text-lime-100"
                        : "border-white/10 text-white/55 hover:bg-white/8"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!selectedReadyOrders.length || bulkBusy}
                  onClick={() => void bulkFulfillReadyOrders()}
                  className="zook-focus ml-auto rounded-full bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
                >
                  {bulkBusy ? "Settling..." : `Settle ${selectedReadyOrders.length || ""}`.trim()}
                </button>
              </div>
              <DataTable
                columns={[
                  {
                    id: "select",
                    header: "Select",
                    render: (order) => (
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleOrder(order.id)}
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
                        <p className="font-medium text-white">
                          {order.id.slice(-8).toUpperCase()}
                        </p>
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
                    title="No payments yet"
                    description="Payments appear here when members buy memberships or shop pickups."
                  />
                }
              />
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionHeader
            eyebrow="Levers"
            title="Revenue opportunities"
            description="Renewals, low stock, and scheduled messages that may need attention."
          />
          <ReadoutGrid
            className="mt-5"
            columns={1}
            items={[
              {
                label: "Renewal window",
                value: formatCompactNumber(summary.expiringMemberships),
                meta: "Members expiring in the next 7 days",
              },
              {
                label: "Inventory pressure",
                value: formatCompactNumber(summary.lowStockProducts),
                meta: "Products close to threshold",
              },
              {
                label: "Notification queue",
                value: formatCompactNumber(summary.notificationQueueCount),
                meta: "Messages still scheduled or failed",
              },
              {
                label: "Plan ladder",
                value: membershipPlans.length ? `${membershipPlans.length} live plans` : "Load plans",
                meta: "Useful while talking renewals at the desk",
              },
            ]}
          />
        </GlassCard>
      </div>
    </div>
  );
}
