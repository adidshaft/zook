import { BaseInvoiceTemplate } from "./BaseInvoiceTemplate";
import type { InvoicePdfData } from "./types";

export function ShopInvoiceTemplate({ invoice }: { invoice: InvoicePdfData }) {
  return <BaseInvoiceTemplate invoice={invoice} />;
}
