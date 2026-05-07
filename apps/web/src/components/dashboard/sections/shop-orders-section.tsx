"use client";

import Link from "next/link";
import { useState } from "react";
import { CsvExportButton, ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { ManagedOn } from "../../ui";
import type { ShopOrderRow } from "../../dashboard-operational-model";
import { formatEnumLabel, formatInr } from "@/lib/format";
import { ShopOrderPaymentControl } from "../read-only/shop-order-payment-control";

const copy = {
  title: "Pickup and fulfillment queue",
  description: "Orders ready for payment or pickup.",
  loadingTitle: "Loading shop orders",
  loadingBody: "Pulling the latest order queue.",
  empty: "No shop orders are currently recorded for this organization.",
};

export function ShopOrdersSection({
  orgId,
  shopOrders,
  readyOrders,
  shopOrdersState,
}: {
  orgId: string;
  shopOrders: ShopOrderRow[];
  readyOrders: ShopOrderRow[];
  shopOrdersState: {
    error?: string | null;
    loading: boolean;
  };
}) {
  const [status, setStatus] = useState("");
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Orders"
        title={copy.title}
        description={copy.description}
        badge={<Pill tone={readyOrders.length ? "amber" : "lime"}>{readyOrders.length} ready</Pill>}
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
      <ManagedOn surface="desk" className="mt-4">
        Ready pickup orders are handed over in Desk after identity verification.
      </ManagedOn>
      {status ? (
        <p className="mt-3 rounded-2xl border border-lime-300/20 bg-lime-300/8 px-4 py-3 text-sm text-lime-100">
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
                render: (order) => <StatusPill value={formatEnumLabel(order.status)} />,
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
                      href={`/desk?tab=pickup&orderId=${encodeURIComponent(order.id)}`}
                      className="zook-focus rounded-full border border-lime-300/35 px-3 py-1 text-xs font-semibold text-lime-100 transition hover:bg-lime-300/10"
                    >
                      Open in Desk
                    </Link>
                  ) : order.status === "PENDING_PAYMENT" && !order.paymentId ? (
                    <ShopOrderPaymentControl
                      orgId={orgId}
                      order={order}
                      onRecorded={() => {
                        setStatus(`Payment recorded for order ${order.id.slice(-8).toUpperCase()}.`);
                      }}
                    />
                  ) : (
                    <span className="text-xs text-white/35">No action</span>
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
