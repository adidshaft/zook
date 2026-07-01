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
  if (mode === "DIRECT_UPI") {
    return "UPI (direct)";
  }
  return mode === "MOCK_ONLINE" ? "Online" : formatEnumLabel(mode);
}

export function formatPaymentStatus(status: string) {
  if (status === "SUCCEEDED") return "Paid";
  if (status === "CREATED") return "Created";
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PROCESSING") {
    return "Payment pending";
  }
  if (status === "REQUIRES_ACTION") return "Action needed";
  if (status === "PARTIALLY_REFUNDED") return "Partly refunded";
  if (status === "REFUNDED") return "Refunded";
  if (status === "FAILED") return "Failed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "DISPUTED") return "Disputed";
  return formatEnumLabel(status);
}

export function formatPaymentPurpose(purpose: string | null | undefined) {
  if (purpose === "MEMBERSHIP") return "Membership";
  if (purpose === "SHOP_ORDER") return "Shop order";
  if (purpose === "PT_PACKAGE") return "Personal training";
  return formatEnumLabel(purpose);
}
