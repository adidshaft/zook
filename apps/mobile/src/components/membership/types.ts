import type { PublicPlanSummary, InvoiceRecord } from "@/lib/query-hooks";

export type MembershipAutopayRecord = {
  id: string;
  status?: string | null;
  checkoutUrl?: string | null;
  provider?: string | null;
  nextChargeAt?: string | null;
  currentEndAt?: string | null;
};

export type MembershipRecord = {
  id: string;
  status?: string | null;
  endsAt?: string | null;
  remainingVisits?: number | null;
  createdAt?: string | null;
  planId?: string | null;
  plan?:
    | (PublicPlanSummary & {
        id?: string | null;
        name?: string | null;
        type?: string | null;
      })
    | null;
  organization?: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;
  autopay?: MembershipAutopayRecord | null;
};

export type MembershipPaymentRecord = {
  id: string;
  orgId?: string | null;
  purpose?: string | null;
  amountPaise?: number | null;
  status?: string | null;
  mode?: string | null;
  receiptNumber?: string | null;
  recordedAt?: string | null;
  createdAt?: string | null;
};

export type PaymentDocumentKind = "receipt" | "invoice";

export type { InvoiceRecord };
