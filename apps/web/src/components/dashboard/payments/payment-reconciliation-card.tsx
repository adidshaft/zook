import { formatCompactNumber, formatInr } from "@/lib/format";
import { ReadoutGrid, SectionHeader } from "../../dashboard-primitives";
import { GlassCard, Pill } from "../../glass-card";
import { CsvExportButton } from "../operational-shared";
import type { OrganizationSummary, PaymentRow } from "@/components/dashboard/types";
import { useT } from "@/lib/use-t";

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
  const t = useT("payments");

  return (
    <GlassCard>
      <SectionHeader
        eyebrow={t("reconciliationEyebrow")}
        title={t("reconciliationTitle")}
        badge={
          <Pill tone={failedPayments.length || pendingPayments.length ? "amber" : "neutral"}>
            {failedPayments.length || pendingPayments.length ? t("reviewQueue") : t("clean")}
          </Pill>
        }
        action={<CsvExportButton href={`/api/orgs/${orgId}/reports/payments.csv`} />}
      />
      <ReadoutGrid
        className="mt-5"
        columns={4}
        items={[
          {
            label: t("settledPayments"),
            value: formatCompactNumber(succeededPayments.length),
            meta: t("dayEndTotals"),
          },
          {
            label: t("pending"),
            value: formatCompactNumber(pendingPayments.length),
            meta: t("awaitConfirmation"),
          },
          {
            label: t("failedRejected"),
            value: formatCompactNumber(failedPayments.length),
            meta: t("followUpRetry"),
          },
          {
            label: t("receiptsToIssue"),
            value: formatCompactNumber(documentReadyPayments.length),
            meta: t("confirmedNoReceipt"),
          },
        ]}
      />
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            title: t("closeCash"),
            copy: t("closeCashCopy", { amount: formatInr(summary.cashCollectedPaise) }),
          },
          {
            title: t("addReceiptDetails"),
            copy: t("addReceiptDetailsCopy"),
          },
          {
            title: t("refundWatch"),
            copy: t("refundWatchCopy"),
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
