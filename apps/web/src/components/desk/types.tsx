export type BranchSummary = { id: string; name: string; isDefault?: boolean; active?: boolean };

export type AttendanceQueueRecord = {
  id: string;
  status: string;
  checkedInAt: string;
  suspiciousFlags?: string[] | null;
  branchName?: string | null;
  user?: { id?: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  profile?: { profilePhotoUrl?: string | null } | null;
  plan?: { name?: string | null } | null;
  subscription?: { endsAt?: string | null; remainingVisits?: number | null } | null;
};

export type MemberRow = {
  profile: { id: string; profilePhotoUrl?: string | null };
  user: { id: string; name: string; email: string; phone?: string | null } | null;
  lastCheckIn?: { checkedInAt: string; status: string } | null;
  recentCheckIns?: Array<{ id: string; checkedInAt: string; status: string }>;
  lastPayment?: { id: string; amountPaise: number; mode: string; recordedAt?: string | null } | null;
  activeSubscription?: {
    id: string;
    planId: string;
    status: string;
    endsAt?: string | null;
    remainingVisits?: number | null;
  } | null;
};

export type PlanRow = { id: string; name: string; pricePaise: number; active: boolean };

export type ShopOrder = {
  id: string;
  status: string;
  totalPaise: number;
  paymentId?: string | null;
  pickupCode?: string | null;
  user?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
  items?: Array<{
    id: string;
    quantity: number;
    unitPaise: number;
    product?: { name?: string | null } | null;
  }>;
};

export type TabKey = "queue" | "member" | "payment" | "pickup";
export type PaymentPurpose = "MEMBERSHIP" | "SHOP_ORDER" | "OTHER";

export type PaymentFormState = {
  purpose: PaymentPurpose;
  memberUserId: string;
  planId: string;
  subscriptionId: string;
  shopOrderId: string;
  amountRupees: string;
  mode: string;
  description: string;
  receiptNumber: string;
  notes: string;
};

export type ReceiptDetails = {
  title: string;
  payer?: string | undefined;
  amountPaise: number;
  mode: string;
  reference?: string | undefined;
  recordedAt: string;
};
