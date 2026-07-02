import Link from "next/link";
import { formatDate, formatInr } from "@/lib/format";
import { GlassCard } from "../../glass-card";
import type { InvoiceRow } from "./billing-section-types";
import { useT } from "@/lib/use-t";

export function BillingInvoiceList({
  invoices,
  nextInvoiceStepHref,
  nextInvoiceStepLabel,
}: {
  invoices: InvoiceRow[];
  nextInvoiceStepHref: string;
  nextInvoiceStepLabel: string;
}) {
  const t = useT("billing");
  return (
    <GlassCard className="xl:col-span-2">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t("invoicesTitle")}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {invoices.length > 0 ? t("recentGeneratedInvoices") : t("invoicesDescription")}
      </p>
      {invoices.length > 0 ? (
        <div className="mt-5 grid gap-2">
          {invoices.slice(0, 10).map((invoice) => (
            <div
              key={invoice.id}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {invoice.invoiceNumber ?? invoice.invoiceNo ?? invoice.id}
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {invoice.user?.name ?? invoice.user?.email ?? t("memberFallback")} &middot;{" "}
                  {formatDate(invoice.issueDate ?? invoice.issuedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatInr(invoice.totalPaise)}
                </span>
                {invoice.invoiceUrl ? (
                  <a
                    href={invoice.invoiceUrl}
                    target="_blank"
                    className="zook-focus rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-sunken)]/80"
                  >
                    {t("downloadPdf")}
                  </a>
                ) : null}
              </div>
            </div>
          ))}
          {invoices.length > 10 ? (
            <Link
              href="/dashboard/payments"
              className="mt-2 block text-right text-xs font-semibold text-[var(--accent-strong)] hover:underline"
            >
              {t("moreInvoices", { count: invoices.length - 10 })} &rarr;
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{t("noInvoicesYet")}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
                {t("noInvoicesDescription")}
              </p>
            </div>
            <Link
              href={nextInvoiceStepHref}
              className="zook-focus inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)]"
            >
              {nextInvoiceStepLabel}
            </Link>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
