import { formatCompactNumber, formatInr } from "@/lib/format";
import { GlassCard } from "../../glass-card";
import type { OrganizationSummary, ShopOrderRow } from "../../dashboard-operational-model";

export function PaymentMetricCards({
  summary,
  queuedOrders,
}: {
  summary: OrganizationSummary;
  queuedOrders: ShopOrderRow[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <GlassCard variant="strong">
        <p className="text-sm text-white/48">Collected at the desk</p>
        <div className="metric mt-3 text-4xl font-semibold text-white">
          {formatInr(summary.cashCollectedPaise)}
        </div>
        <p className="mt-2 text-xs text-white/55">
          Cash, UPI, card, and bank transfers recorded today.
        </p>
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
        <p className="mt-2 text-xs text-white/55">Orders waiting for payment or pickup.</p>
      </GlassCard>
      <GlassCard variant="strong">
        <p className="text-sm text-white/48">Expiring memberships</p>
        <div className="metric mt-3 text-4xl font-semibold text-white">
          {formatCompactNumber(summary.expiringMemberships)}
        </div>
        <p className="mt-2 text-xs text-white/55">A useful renewal queue for the front desk.</p>
      </GlassCard>
    </div>
  );
}
