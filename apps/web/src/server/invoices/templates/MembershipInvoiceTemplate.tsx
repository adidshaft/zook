import { BaseInvoiceTemplate } from "./BaseInvoiceTemplate";
import type { InvoicePdfData } from "./types";

export function MembershipInvoiceTemplate({ invoice }: { invoice: InvoicePdfData }) {
  return <BaseInvoiceTemplate invoice={invoice} />;
}
