"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { CsvExportButton, ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import type { ShopOrderRow } from "@/components/dashboard/types";
import { formatDateTime, formatInr } from "@/lib/format";
import { ShopOrderPaymentControl } from "../payments/shop-order-payment-control";
import type { ResourceState } from "./types";
import type { PillTone } from "../../glass-card";
import { useT } from "@/lib/use-t";

type ShopT = ReturnType<typeof useT>;

function orderDeskNote(order: ShopOrderRow, t: ShopT) {
  if (order.status === "PENDING_PAYMENT") return t("paymentNeededBeforePickup");
  if (order.status === "READY_FOR_PICKUP") return t("verifyPickupInDesk");
  if (order.status === "FULFILLED" || order.status === "CANCELLED") return "";
  return t("reviewOrder");
}

function orderStatusLabel(status: string, t: ShopT) {
  if (status === "PENDING_PAYMENT") return t("paymentPending");
  if (status === "READY_FOR_PICKUP") return t("readyForPickup");
  if (status === "FULFILLED") return t("pickedUp");
  if (status === "CANCELLED") return t("cancelled");
  if (status === "FAILED") return t("failed");
  if (status === "REFUNDED") return t("refunded");
  return t("reviewOrder");
}

function orderStatusTone(status: string): PillTone {
  if (status === "READY_FOR_PICKUP" || status === "FULFILLED") return "lime";
  if (status === "PENDING_PAYMENT" || status === "PROCESSING") return "amber";
  if (status === "CANCELLED" || status === "FAILED" || status === "REFUNDED") return "red";
  return "neutral";
}

function statusMarkClass(tone: PillTone) {
  if (tone === "lime") return "border-[var(--border-focus)] bg-[var(--surface-accent-soft)] text-[var(--accent-strong)]";
  if (tone === "amber") return "border-[color-mix(in_srgb,var(--feedback-warning)_36%,transparent)] bg-[var(--surface-warning-soft)] text-[var(--feedback-warning)]";
  if (tone === "red") return "border-[color-mix(in_srgb,var(--feedback-danger)_36%,transparent)] bg-[var(--surface-danger-soft)] text-[var(--feedback-danger)]";
  if (tone === "blue") return "border-[color-mix(in_srgb,var(--feedback-info)_36%,transparent)] bg-[var(--surface-info-soft)] text-[var(--feedback-info)]";
  return "border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)]";
}

function OrderStatusMark({ status, t }: { status: string; t: ShopT }) {
  const label = orderStatusLabel(status, t);
  const tone = orderStatusTone(status);
  return (
    <span
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-bold ${statusMarkClass(tone)}`}
    >
      <span aria-hidden>
        {status === "FULFILLED" || status === "READY_FOR_PICKUP"
          ? "✓"
          : status === "PENDING_PAYMENT" || status === "PROCESSING"
            ? "…"
            : "!"}
      </span>
    </span>
  );
}

function canRefundOrder(order: ShopOrderRow) {
  return Boolean(order.paymentId && ["READY_FOR_PICKUP", "FULFILLED"].includes(order.status));
}

function orderPriority(order: ShopOrderRow) {
  if (order.status === "PENDING_PAYMENT" && !order.paymentId) return 0;
  if (order.status === "READY_FOR_PICKUP") return 1;
  if (["PENDING_PAYMENT", "PROCESSING"].includes(order.status)) return 2;
  if (order.status === "FULFILLED") return 3;
  if (order.status === "CANCELLED") return 4;
  return 2;
}

function byNewestCreated(left: ShopOrderRow, right: ShopOrderRow) {
  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
}

export function ShopOrdersSection({
  orgId,
  shopOrders,
  readyOrders,
  shopOrdersState,
}: {
  orgId: string;
  shopOrders: ShopOrderRow[];
  readyOrders: ShopOrderRow[];
  shopOrdersState: ResourceState;
}) {
  const t = useT("webUx.shop");
  const [status, setStatus] = useState("");
  const paymentOrders = useMemo(
    () => shopOrders.filter((order) => order.status === "PENDING_PAYMENT" && !order.paymentId),
    [shopOrders],
  );
  const sortedOrders = useMemo(
    () =>
      [...shopOrders].sort(
        (left, right) => orderPriority(left) - orderPriority(right) || byNewestCreated(left, right),
      ),
    [shopOrders],
  );

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("orders")}
        title={t("pickupFulfillmentQueue")}
        description={t("pickupFulfillmentDescription")}
        badge={
          <div className="flex items-center gap-2">
            <Pill tone={paymentOrders.length ? "amber" : "neutral"}>
              {t("payCount", { count: paymentOrders.length })}
            </Pill>
            <Pill tone={readyOrders.length ? "amber" : "neutral"}>
              {t("pickupCount", { count: readyOrders.length })}
            </Pill>
          </div>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
      <ManagedOn surface="desk" className="mt-4">
        {t("pickupManagedInDesk")}
      </ManagedOn>
      {status ? (
        <p className="mt-3 rounded-2xl border border-blue-300/25 bg-blue-300/10 px-4 py-3 text-sm text-blue-50">
          {status}
        </p>
      ) : null}
      <div className="mt-5">
        {shopOrdersState.error ? (
          <ErrorNotice message={shopOrdersState.error} />
        ) : shopOrdersState.loading && shopOrders.length === 0 ? (
          <EmptyState title={t("loadingShopOrders")} description={t("loadingOrderQueue")} />
        ) : (
          <DataTable
            columns={[
              {
                id: "order",
                header: t("order"),
                render: (order) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {order.user?.name ?? t("member")}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      #{order.id.slice(-8).toUpperCase()} · {t("lineItemCount", { count: order.items.length })}
                    </p>
                  </div>
                ),
              },
              {
                id: "status",
                header: t("status"),
                render: (order) => {
                  const note = orderDeskNote(order, t);
                  return (
                    <div className="flex min-w-0 items-center gap-2">
                      <OrderStatusMark status={order.status} t={t} />
                      <span className="truncate text-xs text-white/45">
                        {note || orderStatusLabel(order.status, t)}
                      </span>
                    </div>
                  );
                },
              },
              {
                id: "created",
                header: t("created"),
                render: (order) => formatDateTime(order.createdAt),
              },
              {
                id: "pickup",
                header: t("pickup"),
                render: (order) => order.pickupCode ?? t("awaitingCode"),
              },
              {
                id: "total",
                header: t("total"),
                align: "right",
                render: (order) => (
                  <span className="font-medium text-white">{formatInr(order.totalPaise)}</span>
                ),
              },
              {
                id: "action",
                header: t("action"),
                align: "right",
                render: (order) =>
                  order.status === "READY_FOR_PICKUP" ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/desk/orders?orderId=${encodeURIComponent(order.id)}`}
                        className="zook-focus rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/68 transition hover:bg-white/8 hover:text-white"
                      >
                        {t("openInDesk")}
                      </Link>
                      {canRefundOrder(order) ? <RefundOrderDisclosure order={order} t={t} /> : null}
                    </div>
                  ) : order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                    <ShopOrderPaymentControl
                      orgId={orgId}
                      order={order}
                      onRecorded={() => {
                        setStatus(
                          t("paymentRecordedForOrder", { order: order.id.slice(-8).toUpperCase() }),
                        );
                      }}
                    />
                  ) : order.status === "FULFILLED" ? (
                    canRefundOrder(order) ? (
                      <RefundOrderDisclosure order={order} t={t} />
                    ) : (
                      <span className="text-xs text-white/35">-</span>
                    )
                  ) : order.status === "CANCELLED" ? (
                    <span className="text-xs text-white/35">-</span>
                  ) : (
                    <span className="text-xs text-white/35">-</span>
                  ),
              },
            ]}
            rows={sortedOrders}
            rowKey={(order) => order.id}
            empty={t("noShopOrders")}
          />
        )}
      </div>
    </GlassCard>
  );
}

function RefundOrderDisclosure({ order, t }: { order: ShopOrderRow; t: ShopT }) {
  if (!order.paymentId) return null;
  return (
    <details className="group relative inline-block">
      <summary
        aria-label={t("moreOrderActions")}
        className="zook-focus inline-flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-white/12 text-xs font-bold text-white/58 transition hover:bg-white/8 hover:text-white"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 min-w-32 rounded-2xl border border-white/10 bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-lg)]">
        <Link
          href={`/dashboard/payments?search=${encodeURIComponent(order.paymentId)}`}
          className="zook-focus block rounded-xl px-3 py-2 text-xs font-semibold text-white/68 transition hover:bg-white/8 hover:text-white"
        >
          {t("refundOrder")}
        </Link>
      </div>
    </details>
  );
}
