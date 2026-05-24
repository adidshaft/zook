import { BaseInvoiceTemplate } from "./BaseInvoiceTemplate";
import type { InvoicePdfData } from "./types";

export function SaasInvoiceTemplate({ invoice }: { invoice: InvoicePdfData }) {
  return <BaseInvoiceTemplate invoice={invoice} />;
}
