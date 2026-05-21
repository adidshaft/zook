import { formatCompactNumber, formatInr } from "@/lib/format";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { CsvExportButton } from "../operational-shared";
import type { OrganizationSummary, PaymentRow } from "../../dashboard-operational-model";

export function PaymentReconciliationCard({
  orgId,
  summary,
  succeededPayments,
  failedPayments,
  pendingPayments,
  documentReadyPayments,
}: {
  orgId: string;
  summary: OrganizationSummary;
  succeededPayments: PaymentRow[];
  failedPayments: PaymentRow[];
  pendingPayments: PaymentRow[];
  documentReadyPayments: PaymentRow[];
}) {
  return (
    <GlassCard>
      <SectionHeader
        eyebrow="Reconciliation"
        title="Payment reconciliation"
        description="A focused check for what is settled, what still needs proof, and what should be chased before closing the day."
        badge={
          <Pill tone={failedPayments.length || pendingPayments.length ? "amber" : "lime"}>
            {failedPayments.length || pendingPayments.length ? "Review queue" : "Clean"}
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/payments.csv`} />}
      />
      <ReadoutGrid
        className="mt-5"
        columns={4}
        items={[
          {
            label: "Settled payments",
            value: formatCompactNumber(succeededPayments.length),
            meta: "Ready for day-end totals",
          },
          {
            label: "Pending",
            value: formatCompactNumber(pendingPayments.length),
            meta: "Await confirmation or proof",
          },
          {
            label: "Failed/rejected",
            value: formatCompactNumber(failedPayments.length),
            meta: "Follow up before retry",
          },
          {
            label: "Receipts to issue",
            value: formatCompactNumber(documentReadyPayments.length),
            meta: "Confirmed payments without receipt ref",
          },
        ]}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            title: "Close cash",
            copy: `${formatInr(summary.cashCollectedPaise)} desk-collected amount should match cash/UPI/card slips.`,
          },
          {
            title: "Attach proof",
            copy: "Offline payments should include a reference or uploaded proof before owner review.",
          },
          {
            title: "Refund watch",
            copy: "Use the refunds tab for partial or failed-payment correction instead of editing history.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="font-medium text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-white/55">{item.copy}</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
