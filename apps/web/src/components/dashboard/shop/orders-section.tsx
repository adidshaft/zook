"use client";

import Link from "next/link";
import { useState } from "react";
import { CsvExportButton, ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import type { ShopOrderRow } from "@/components/dashboard/types";
import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import { ShopOrderPaymentControl } from "../payments/shop-order-payment-control";
import type { ResourceState } from "./types";

const copy = {
  title: "Pickup and fulfillment queue",
  description: "Orders needing payment, pickup verification, or review.",
  loadingTitle: "Loading shop orders",
  loadingBody: "Loading current order queue.",
  empty: "No shop orders are currently recorded for this gym.",
};

function orderDeskNote(order: ShopOrderRow) {
  if (order.status === "PENDING_PAYMENT") return "Payment needed before pickup";
  if (order.status === "READY_FOR_PICKUP") return "Verify pickup in Desk";
  if (order.status === "FULFILLED") return "Already fulfilled";
  if (order.status === "CANCELLED") return "Cancelled";
  return "Review order";
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
  const [status, setStatus] = useState("");
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Orders"
        title={copy.title}
        description={copy.description}
        badge={<Pill tone={readyOrders.length ? "amber" : "neutral"}>{readyOrders.length} pickup</Pill>}
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
      <ManagedOn surface="desk" className="mt-4">
        Pickup orders are handed over in Desk after identity verification.
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
          <EmptyState title={copy.loadingTitle} description={copy.loadingBody} />
        ) : (
          <DataTable
            columns={[
              {
                id: "order",
                header: "Order",
                render: (order) => (
                  <div>
                    <p className="font-medium text-white">{order.id.slice(-8).toUpperCase()}</p>
                    <p className="mt-1 text-xs text-white/45">{order.items.length} line items</p>
                  </div>
                ),
              },
              {
                id: "status",
                header: "Status",
                render: (order) => (
                  <div className="grid gap-1">
                    <StatusPill value={formatEnumLabel(order.status)} />
                    <span className="text-xs text-white/38">{orderDeskNote(order)}</span>
                  </div>
                ),
              },
              {
                id: "created",
                header: "Created",
                render: (order) => formatDateTime(order.createdAt),
              },
              {
                id: "pickup",
                header: "Pickup",
                render: (order) => order.pickupCode ?? "Awaiting code",
              },
              {
                id: "total",
                header: "Total",
                align: "right",
                render: (order) => (
                  <span className="font-medium text-white">{formatInr(order.totalPaise)}</span>
                ),
              },
              {
                id: "action",
                header: "Action",
                align: "right",
                render: (order) =>
                  order.status === "READY_FOR_PICKUP" ? (
                    <Link
                      href={`/desk/orders?orderId=${encodeURIComponent(order.id)}`}
                      className="zook-focus rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-white/68 transition hover:bg-white/8 hover:text-white"
                    >
                      Open in Desk
                    </Link>
                  ) : order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                    <ShopOrderPaymentControl
                      orgId={orgId}
                      order={order}
                      onRecorded={() => {
                        setStatus(
                          `Payment recorded for order ${order.id.slice(-8).toUpperCase()}.`,
                        );
                      }}
                    />
                  ) : order.status === "FULFILLED" ? (
                    <span className="text-xs text-white/35">Already fulfilled</span>
                  ) : order.status === "CANCELLED" ? (
                    <span className="text-xs text-white/35">Cancelled</span>
                  ) : (
                    <span className="text-xs text-white/35">No desk step</span>
                  ),
              },
            ]}
            rows={shopOrders}
            rowKey={(order) => order.id}
            empty={copy.empty}
          />
        )}
      </div>
    </GlassCard>
  );
}
