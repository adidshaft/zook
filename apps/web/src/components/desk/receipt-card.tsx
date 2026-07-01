import { formatDateTime, formatInr } from "@/lib/format";
import { formatPaymentMode } from "@/components/dashboard/payments/payments-utils";
import type { DeskCopy } from "./copy";
import type { ReceiptDetails } from "./types";
import { ZookButton } from "../zook-button";

export function ReceiptCard({
  copy,
  receipt,
}: {
  copy: DeskCopy;
  receipt: ReceiptDetails;
}) {
  return (
    <div className="mt-5 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/45">{copy.receiptReady}</p>
          <p className="mt-1 truncate text-base font-semibold text-white">{receipt.title}</p>
          {receipt.payer ? (
            <p className="mt-1 truncate text-xs text-white/55">
              {copy.receiptFor}: {receipt.payer}
            </p>
          ) : null}
        </div>
        <p className="text-xl font-semibold tabular-nums text-white">{formatInr(receipt.amountPaise)}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          [copy.receiptMode, formatPaymentMode(receipt.mode)],
          [copy.receiptReference, receipt.reference || copy.notAdded],
          [copy.receiptDate, formatDateTime(receipt.recordedAt)],
        ].map(([label, value]) => (
          <span
            key={label}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs text-white/55"
            title={`${label}: ${value}`}
          >
            <span className="text-white/35">{label}</span>
            <span className="max-w-[14rem] truncate font-medium text-white/75">{value}</span>
          </span>
        ))}
      </div>
      <ZookButton
        type="button"
        tone="ghost"
        size="sm"
        onClick={() => window.print()}
        className="mt-4"
      >
        {copy.printReceipt}
      </ZookButton>
    </div>
  );
}
