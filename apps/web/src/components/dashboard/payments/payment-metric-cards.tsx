import { formatCompactNumber, formatInr } from "@/lib/format";
import type { OrganizationSummary, ShopOrderRow } from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";

export function PaymentMetricCards({
  summary,
  queuedOrders,
}: {
  summary: OrganizationSummary;
  queuedOrders: ShopOrderRow[];
}) {
  const t = useT("payments");

  return (
    <div className="grid gap-2 rounded-[22px] border border-white/10 bg-black/20 p-2 sm:grid-cols-2 xl:grid-cols-4">
      {[
        [t("metricsDesk"), formatInr(summary.cashCollectedPaise), t("metricsToday")],
        [t("metricsRevenue"), formatInr(summary.revenuePaise), t("metricsSettled")],
        [t("metricsShopQueue"), formatCompactNumber(queuedOrders.length), t("metricsPaymentOrPickup")],
        [t("metricsRenewals"), formatCompactNumber(summary.expiringMemberships), t("metricsExpiring")],
      ].map(([label, value, meta]) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-black/24 px-3 py-2"
        >
          <p className="text-xs font-medium text-white/48">{label}</p>
          <div className="metric mt-1 truncate text-lg font-semibold text-white">{value}</div>
          <p className="mt-0.5 truncate text-[11px] text-white/45">{meta}</p>
        </div>
      ))}
    </div>
  );
}
