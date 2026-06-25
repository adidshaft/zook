import { MetricGrid } from "@/components/domain/metric-grid";
import type { OrgPaymentRecord } from "@/lib/domains/shared/types";
import { formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";

export function RevenueSummary({
  revenuePaise,
  payments,
}: {
  revenuePaise: number;
  payments: OrgPaymentRecord[];
}) {
  const t = useT();
  return (
    <MetricGrid
      items={[
        {
          label: t("owner.revenue.revenueToday"),
          value: formatInr(revenuePaise),
          tone: "blue",
        },
        {
          label: t("owner.revenue.manualRecords"),
          value: formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0)),
          tone: "neutral",
        },
      ]}
    />
  );
}
