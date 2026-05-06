import { formatEnumLabel } from "@/lib/format";

export type PaymentReceiptState = {
  title: string;
  amountPaise: number;
  mode: string;
  reference?: string | undefined;
  recordedAt: string;
};

export const modeOptions = ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export function formatPaymentMode(mode: string) {
  return mode === "MOCK_ONLINE" ? "Online" : formatEnumLabel(mode);
}
