export type BranchSummary = { id: string; name: string; isDefault?: boolean; active?: boolean };

export type AttendanceQueueRecord = {
  id: string;
  status: string;
  checkedInAt: string;
  entryCode?: string | null;
  suspiciousFlags?: string[] | null;
  branchName?: string | null;
  user?: {
    id?: string;
    name?: string | null;
    privateHandle?: string | null;
    email?: string | null;
    phone?: string | null;
    dateOfBirth?: string | Date | null;
    emergencyContact?: { name?: string | null; phone?: string | null } | null;
    profilePhotoUrl?: string | null;
  } | null;
  profile?: { profilePhotoUrl?: string | null } | null;
  plan?: { name?: string | null } | null;
  subscription?: { endsAt?: string | null; remainingVisits?: number | null } | null;
};

export type MemberRow = {
  profile: { id: string; profilePhotoUrl?: string | null };
  user: {
    id: string;
    name: string;
    privateHandle?: string | null;
    email: string;
    phone?: string | null;
    dateOfBirth?: string | Date | null;
    emergencyContact?: { name?: string | null; phone?: string | null } | null;
    profilePhotoUrl?: string | null;
  } | null;
  activeCheckIn?: {
    id: string;
    checkedInAt: string;
    status: string;
    branchId?: string | null;
    branchName?: string | null;
  } | null;
  lastCheckIn?: {
    id?: string;
    checkedInAt: string;
    checkedOutAt?: string | null;
    status: string;
    branchId?: string | null;
    branchName?: string | null;
  } | null;
  recentCheckIns?: Array<{
    id: string;
    checkedInAt: string;
    checkedOutAt?: string | null;
    status: string;
    branchId?: string | null;
    branchName?: string | null;
  }>;
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
  createdAt?: string | null;
  updatedAt?: string | null;
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
  proofAssetId: string;
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

export type DeskPaymentRow = {
  id: string;
  orgId?: string | null;
  purpose: string;
  amountPaise: number;
  status: string;
  mode: string;
  provider?: string | null;
  providerRef?: string | null;
  receiptNumber?: string | null;
  refundedAmountPaise?: number | null;
  refunds?: Array<{
    id: string;
    amountPaise: number;
    status: string;
    reason?: string | null;
    createdAt: string | Date;
    processedAt?: string | Date | null;
  }>;
  recordedAt?: string | Date | null;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};
