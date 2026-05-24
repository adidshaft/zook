export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitAmountPaise?: number;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  hsnCode?: string | null;
};

export type InvoicePdfData = {
  title: "Tax Invoice" | "Bill of Supply" | "Receipt";
  invoiceNumber: string;
  issueDate: Date;
  seller: {
    name: string;
    address: string;
    gstin?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  buyer: {
    name: string;
    address?: string | null;
    gstin?: string | null;
    phone?: string | null;
  };
  lineItems: InvoicePdfLineItem[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  currency: string;
  footer?: string;
};
