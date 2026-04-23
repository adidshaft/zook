import type { PaymentMode, PaymentPurpose, PaymentStatus } from "../types";

export interface PaymentSessionState {
  id: string;
  purpose: PaymentPurpose;
  amountPaise: number;
  status: PaymentStatus;
}

const terminalStatuses: PaymentStatus[] = ["SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"];

export function transitionPaymentSession(
  session: PaymentSessionState,
  nextStatus: PaymentStatus,
  input: { expectedAmountPaise?: number } = {},
): PaymentSessionState {
  if (input.expectedAmountPaise !== undefined && input.expectedAmountPaise !== session.amountPaise) {
    throw new Error("Payment amount mismatch");
  }
  if (terminalStatuses.includes(session.status) && session.status !== nextStatus) {
    throw new Error("Payment session already completed");
  }
  if (session.status === "CREATED" && !["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"].includes(nextStatus)) {
    throw new Error("Invalid payment transition");
  }
  if (session.status === "PENDING" && !["SUCCEEDED", "FAILED", "CANCELLED"].includes(nextStatus)) {
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
