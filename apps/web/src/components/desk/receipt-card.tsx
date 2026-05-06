import { formatDateTime, formatEnumLabel, formatInr } from "@/lib/format";
import type { DeskCopy } from "./copy";
import type { ReceiptDetails } from "./types";

export function ReceiptCard({
  copy,
  receipt,
}: {
  copy: DeskCopy;
  receipt: ReceiptDetails;
}) {
  return (
    <div className="mt-5 rounded-[22px] border border-lime-300/20 bg-lime-300/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100/70">
        {copy.receiptReady}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{receipt.title}</p>
      {receipt.payer ? (
        <p className="mt-2 text-sm text-white/65">
          {copy.receiptFor}: {receipt.payer}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-white/65">
        {copy.receiptAmount}: {formatInr(receipt.amountPaise)}
      </p>
      <p className="mt-1 text-sm text-white/65">
        {copy.receiptMode}: {formatEnumLabel(receipt.mode)}
      </p>
      <p className="mt-1 text-sm text-white/65">
        {copy.receiptReference}: {receipt.reference || copy.notAdded}
      </p>
      <p className="mt-1 text-sm text-white/65">
        {copy.receiptDate}: {formatDateTime(receipt.recordedAt)}
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="zook-focus mt-4 rounded-full border border-white/10 px-4 py-2 text-sm text-white/72"
      >
        {copy.printReceipt}
      </button>
    </div>
  );
}
