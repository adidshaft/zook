import type {
  MembershipPlanRow,
  MemberRow,
  OrganizationSummary,
  PaymentRow,
  ShopOrderRow,
} from "@/components/dashboard/types";
import type { LoadingState, PagedState } from "../read-only/types";
import type { Permission } from "@zook/core";

export type PaymentsPanelProps = {
  orgId: string;
  summary: OrganizationSummary;
  queuedOrders: ShopOrderRow[];
  membershipPlans: MembershipPlanRow[];
  members: MemberRow[];
  payments: PaymentRow[];
  paymentsState: PagedState;
  shopOrders: ShopOrderRow[];
  shopOrdersState: LoadingState;
  permissions?: Permission[];
};

export type ManualPaymentForm = {
  memberUserId: string;
  planId: string;
  amountRupees: string;
  mode: string;
  proofAssetId: string;
  receiptNumber: string;
  notes: string;
};

export type PaymentDocumentKind = "receipt" | "invoice";
