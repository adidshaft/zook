export type BillingProfile = {
  legalName: string;
  gstNumber: string;
  billingEmail: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  receiptReady: boolean;
  invoiceReady: boolean;
  receiptMissing: string[];
  invoiceMissing: string[];
};

export type InvoiceRow = {
  id: string;
  invoiceNumber?: string | null;
  invoiceNo?: string | null;
  issueDate?: string | Date | null;
  issuedAt?: string | Date | null;
  totalPaise: number;
  status: string;
  invoiceUrl?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
};

export type SaasEntitlements = {
  memberLimit: number | null;
  branchLimit: number | null;
  staffLimit: number | null;
  trainerLimit: number | null;
  productLimit: number | null;
  notificationMonthlyLimit: number | null;
  aiTextMonthlyLimit: number;
  aiImageMonthlyLimit: number;
  reports: "basic" | "advanced" | "custom";
  referrals: "basic" | "advanced" | "custom";
  support: "standard" | "priority" | "premium";
  onboarding: "self_serve" | "assisted" | "white_glove";
  multiBranch: boolean;
  apiAccess: boolean;
};

export type SaasUsage = {
  activeMemberCount: number;
  branchCount: number;
  staffCount: number;
  trainerCount: number;
  productCount: number;
  notificationMonthlyCount: number;
  aiTextMonthlyCount: number;
  aiImageMonthlyCount: number;
};

export type SubscriptionDetail = {
  subscription: {
    orgStatus: string;
    trialStartAt: string | Date;
    trialEndAt: string | Date;
    status: string;
    tier: "FREE" | "STARTER" | "GROWTH" | "PRO";
    billingCycle: "MONTHLY" | "YEARLY";
    priceLockedPaise: number | null;
    billingEmail: string | null;
    nextBillingAt: string | Date | null;
    nextRenewalAt: string | Date | null;
    cancelledAt: string | Date | null;
    cancelAtPeriodEnd: boolean;
  };
  activeMemberCount: number;
  pricing: Record<
    "STARTER" | "GROWTH" | "PRO",
    {
      monthly: number;
      yearly: number;
      memberLimit: number | null;
      entitlements: SaasEntitlements;
    }
  >;
  entitlements: SaasEntitlements;
  usage: SaasUsage;
  mandate: {
    id: string;
    status: string;
    provider: string;
    providerMandateId: string | null;
    amountPaise: number;
    currency: string;
    billingPeriod: string;
    billingInterval: number;
    paidCount: number;
    totalCount: number;
    nextChargeAt: string | Date | null;
    currentEndAt: string | Date | null;
    authenticatedAt: string | Date | null;
    activatedAt: string | Date | null;
    cancelledAt: string | Date | null;
    checkoutUrl: string | null;
  } | null;
  platformReferral: {
    code: string;
    referredCount: number;
    recent: Array<{
      id: string;
      targetOrgId: string;
      status: string;
      createdAt: string | Date;
    }>;
  };
};
