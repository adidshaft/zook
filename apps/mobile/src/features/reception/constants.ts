import type { PaymentMode } from "@zook/core";

export type DeskPaymentMode = Extract<
  PaymentMode,
  "CASH" | "DIRECT_UPI" | "BANK_TRANSFER" | "CARD" | "OTHER"
>;

export const paymentModes: Array<{ label: string; value: DeskPaymentMode }> = [
  { label: "Cash", value: "CASH" },
  { label: "Direct UPI", value: "DIRECT_UPI" },
  { label: "Bank", value: "BANK_TRANSFER" },
  { label: "Card", value: "CARD" },
  { label: "Manual", value: "OTHER" },
];

export const reasonSuggestions = [
  "Desk confirmed member identity",
  "Member showed active membership",
  "QR was unreadable at entry",
];
