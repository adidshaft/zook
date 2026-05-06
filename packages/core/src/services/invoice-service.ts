export interface InvoiceLineItemInput {
  description: string;
  quantity?: number;
  unitAmountPaise: number;
  gstRateBps?: number | null;
  hsnCode?: string;
}

export interface CalculatedInvoiceLineItem extends InvoiceLineItemInput {
  quantity: number;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
}

export interface InvoiceTotals {
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  gstRateBps?: number;
  items: CalculatedInvoiceLineItem[];
}

function assertPaise(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer amount in paise.`);
  }
}

function normalizeQuantity(value: number | undefined) {
  const quantity = value ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Invoice line item quantity must be a positive integer.");
  }
  return quantity;
}

function calculateGstPaise(subtotalPaise: number, gstRateBps: number | undefined | null) {
  if (!gstRateBps) {
    return 0;
  }
  if (!Number.isInteger(gstRateBps) || gstRateBps < 0 || gstRateBps > 10_000) {
    throw new Error("GST rate must be between 0 and 10000 basis points.");
  }
  return Math.round((subtotalPaise * gstRateBps) / 10_000);
}

export function calculateInvoiceTotals(input: {
  items: InvoiceLineItemInput[];
  defaultGstRateBps?: number | null;
}): InvoiceTotals {
  if (!input.items.length) {
    throw new Error("Invoice requires at least one line item.");
  }

  const items = input.items.map((item) => {
    if (!item.description.trim()) {
      throw new Error("Invoice line item description is required.");
    }
    assertPaise(item.unitAmountPaise, "Invoice line item unit amount");
    const quantity = normalizeQuantity(item.quantity);
    const subtotalPaise = item.unitAmountPaise * quantity;
    const gstRateBps = item.gstRateBps ?? input.defaultGstRateBps ?? undefined;
    const gstPaise = calculateGstPaise(subtotalPaise, gstRateBps);
    const { gstRateBps: _gstRateBps, quantity: _quantity, ...lineItem } = item;
    return {
      ...lineItem,
      quantity,
      ...(gstRateBps !== undefined ? { gstRateBps } : {}),
      subtotalPaise,
      gstPaise,
      totalPaise: subtotalPaise + gstPaise,
    };
  });

  const subtotalPaise = items.reduce((sum, item) => sum + item.subtotalPaise, 0);
  const gstPaise = items.reduce((sum, item) => sum + item.gstPaise, 0);
  const gstRates = [...new Set(items.map((item) => item.gstRateBps).filter(Boolean))] as number[];

  return {
    subtotalPaise,
    gstPaise,
    totalPaise: subtotalPaise + gstPaise,
    ...(gstRates.length === 1 ? { gstRateBps: gstRates[0] } : {}),
    items,
  };
}

function invoiceOrgCode(value: string) {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  return code || "ORG";
}

export function buildInvoiceNumber(input: {
  orgCode: string;
  issueDate: Date;
  sequence: number;
}) {
  if (!Number.isInteger(input.sequence) || input.sequence <= 0) {
    throw new Error("Invoice sequence must be a positive integer.");
  }
  const year = input.issueDate.getUTCFullYear();
  const month = String(input.issueDate.getUTCMonth() + 1).padStart(2, "0");
  return `ZK-${invoiceOrgCode(input.orgCode)}-${year}${month}-${String(input.sequence).padStart(5, "0")}`;
}
