import { EmptyState, ReadoutGrid, SectionHeader, StatusPill } from "../../../dashboard-primitives";
import { GlassCard } from "../../../glass-card";
import { formatCompactNumber, formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import type { OverviewOperationalSectionProps } from "./types";

type InsightsInventoryCardProps = Pick<
  OverviewOperationalSectionProps,
  | "organization"
  | "auditLogCount"
  | "initialNotifications"
  | "initialProducts"
  | "initialAiUsage"
>;

export function InsightsInventoryCard({
  organization,
  auditLogCount,
  initialNotifications,
  initialProducts,
  initialAiUsage,
}: InsightsInventoryCardProps) {
  return (
<div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
  <GlassCard>
    <SectionHeader
      eyebrow="Signals"
      title="Recent drafts and messages"
      description="A shared snapshot of assisted drafts and member communication."
    />
    <div className="mt-5 grid gap-3">
      {initialAiUsage.slice(0, 3).map((usage) => (
        <div key={usage.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-white">{usage.promptSummary}</p>
            <div className="flex gap-2">
              <StatusPill value={formatEnumLabel(usage.requestType)} />
            </div>
          </div>
          <p className="mt-2 text-xs text-white/45">{formatDateTime(usage.createdAt)}</p>
        </div>
      ))}
      {!initialAiUsage.length ? (
        <EmptyState
          title="No assistant activity in the current view"
          description="This gym has not created assisted drafts yet."
        />
      ) : null}
      {initialNotifications.slice(0, 2).map((notification) => (
        <div
          key={notification.id}
          className="rounded-[22px] border border-white/10 bg-black/20 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium text-white">{notification.title}</p>
            <StatusPill value={formatEnumLabel(notification.status)} />
          </div>
          <p className="mt-2 text-xs text-white/45">
            {formatEnumLabel(notification.type)} · {formatDateTime(notification.createdAt)}
          </p>
        </div>
      ))}
    </div>
  </GlassCard>

  <GlassCard>
    <SectionHeader
      eyebrow="Inventory and Governance"
      title="Edges worth watching"
      description="These checks show quiet operational risk before members feel it."
    />
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
          Low-stock products
        </p>
        <div className="mt-4 grid gap-3">
          {initialProducts.length ? (
            initialProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{product.name}</p>
                  <p className="text-xs text-white/45">
                    {formatInr(product.pricePaise ?? 0)}
                  </p>
                </div>
                <StatusPill
                  value={`${product.stock ?? 0} left`}
                  tone={
                    (product.stock ?? 0) <= (product.lowStockThreshold ?? 0)
                      ? "amber"
                      : "blue"
                  }
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-white/48">
              No low-stock products in the current snapshot.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
          Control status
        </p>
        <ReadoutGrid
          className="mt-4"
          columns={1}
          items={[
            {
              label: "Audit log",
              value: formatCompactNumber(auditLogCount),
              meta: "Admin action history",
            },
            {
              label: "Join mode",
              value: formatEnumLabel(organization.joinMode),
              meta: `${organization.city}${organization.state ? `, ${organization.state}` : ""}`,
            },
            {
              label: "Primary contact",
              value: organization.contactEmail ?? organization.contactPhone ?? "Desk-owned",
              meta: "Primary escalation route",
            },
          ]}
        />
      </div>
    </div>
  </GlassCard>
</div>
  );
}
