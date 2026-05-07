"use client";

import { CsvExportButton, ErrorNotice } from "../operational-shared";
import { DataTable, EmptyState, SectionHeader, StatusPill } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import type { ShopOrderRow } from "../../dashboard-operational-model";
import { formatEnumLabel, formatInr } from "@/lib/format";

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
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Orders"
        title={copy.title}
        description={copy.description}
        badge={<Pill tone={readyOrders.length ? "amber" : "lime"}>{readyOrders.length} ready</Pill>}
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/shop.csv`} />}
      />
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
