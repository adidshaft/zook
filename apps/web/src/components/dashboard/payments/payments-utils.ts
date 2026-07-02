import { formatEnumLabel } from "@/lib/format";
import { useT } from "@/lib/use-t";

export type PaymentsT = ReturnType<typeof useT>;

export type PaymentReceiptState = {
  title: string;
  amountPaise: number;
  mode: string;
  reference?: string | undefined;
  recordedAt: string;
};

export const modeOptions = ["CASH", "DIRECT_UPI", "BANK_TRANSFER", "CARD", "OTHER"] as const;

export function formatPaymentMode(mode: string, t?: PaymentsT) {
  if (mode === "DIRECT_UPI") {
    return t ? t("modeDirectUpi") : "UPI (direct)";
  }
  return mode === "MOCK_ONLINE" ? (t ? t("modeOnline") : "Online") : formatEnumLabel(mode);
}

export function formatPaymentStatus(status: string, t?: PaymentsT) {
  if (status === "SUCCEEDED") return t ? t("statusPaid") : "Paid";
  if (status === "CREATED") return t ? t("statusCreated") : "Created";
  if (status === "PENDING" || status === "PENDING_PAYMENT" || status === "PROCESSING") {
    return t ? t("statusPaymentPending") : "Payment pending";
  }
  if (status === "REQUIRES_ACTION") return t ? t("statusActionNeeded") : "Action needed";
  if (status === "PARTIALLY_REFUNDED") return t ? t("statusPartlyRefunded") : "Partly refunded";
  if (status === "REFUNDED") return t ? t("statusRefunded") : "Refunded";
  if (status === "FAILED") return t ? t("statusFailed") : "Failed";
  if (status === "CANCELLED") return t ? t("statusCancelled") : "Cancelled";
  if (status === "DISPUTED") return t ? t("statusDisputed") : "Disputed";
  return formatEnumLabel(status);
}

export function formatPaymentPurpose(purpose: string | null | undefined, t?: PaymentsT) {
  if (purpose === "MEMBERSHIP") return t ? t("purposeMembership") : "Membership";
  if (purpose === "SHOP_ORDER") return t ? t("purposeShopOrder") : "Shop order";
  if (purpose === "PT_PACKAGE") return t ? t("purposePtPackage") : "Personal training";
  return formatEnumLabel(purpose);
}
