import type { PaymentMode, PaymentPurpose, PaymentStatus } from "../types";

export interface PaymentSessionState {
  id: string;
  purpose: PaymentPurpose;
  amountPaise: number;
  status: PaymentStatus;
}

const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ["PENDING", "REQUIRES_ACTION", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  PENDING: ["REQUIRES_ACTION", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  REQUIRES_ACTION: ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
  SUCCEEDED: ["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED", "DISPUTED"],
  DISPUTED: ["PARTIALLY_REFUNDED", "REFUNDED"]
};

export function transitionPaymentSession(
  session: PaymentSessionState,
  nextStatus: PaymentStatus,
  input: { expectedAmountPaise?: number } = {},
): PaymentSessionState {
  if (input.expectedAmountPaise !== undefined && input.expectedAmountPaise !== session.amountPaise) {
    throw new Error("Payment amount mismatch");
  }
  if (session.status === nextStatus) {
    return session;
  }
  if (!allowedTransitions[session.status].includes(nextStatus)) {
    if (["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED", "DISPUTED"].includes(session.status)) {
      throw new Error("Payment session already completed");
    }
    throw new Error("Invalid payment transition");
  }
  return { ...session, status: nextStatus };
}

export function createManualPaymentAdjustment(input: {
  originalAmountPaise: number;
  adjustmentAmountPaise: number;
  reason?: string;
  mode: PaymentMode;
}): { adjustmentType: "REVERSAL" | "CORRECTION"; amountPaise: number; reason: string } {
  if (!input.reason?.trim()) {
    throw new Error("Manual payment adjustment reason required");
  }
  if (input.mode === "MOCK_ONLINE" || input.mode === "CARD") {
    throw new Error("Manual adjustment requires an offline payment mode");
  }
  return {
    adjustmentType: input.adjustmentAmountPaise < 0 ? "REVERSAL" : "CORRECTION",
    amountPaise: input.adjustmentAmountPaise,
    reason: input.reason
  };
}
