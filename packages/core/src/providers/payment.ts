import type { DiagnosticProvider, PaymentPurpose, PaymentStatus, ProviderInstanceDiagnostics } from "../types";

export interface CheckoutSessionInput {
  orgId?: string;
  userId?: string;
  purpose: PaymentPurpose;
  amountPaise: number;
  currency?: "INR";
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  status: PaymentStatus;
  amountPaise: number;
  purpose: PaymentPurpose;
}

export interface PaymentProvider extends DiagnosticProvider {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyWebhook(input: { sessionId: string; payload: unknown; signature?: string }): Promise<PaymentStatus>;
  getPaymentStatus(sessionId: string): Promise<PaymentStatus>;
  refundPayment(input: { paymentId: string; amountPaise?: number; reason?: string }): Promise<PaymentStatus>;
  createMandate(input: { userId: string; amountPaise: number; metadata?: Record<string, unknown> }): Promise<{ mandateId: string; status: string }>;
  cancelMandate(input: { mandateId: string; reason?: string }): Promise<{ mandateId: string; status: string }>;
}

export class MockPaymentProvider implements PaymentProvider {
  private sessions = new Map<string, CheckoutSessionResult>();

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        checkoutMode: "mock-hosted",
        sessionCount: this.sessions.size
      }
    };
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const sessionId = `mock_${Math.random().toString(36).slice(2, 12)}`;
    const result: CheckoutSessionResult = {
      sessionId,
      checkoutUrl: `/checkout/mock/${sessionId}`,
      status: "CREATED",
      amountPaise: input.amountPaise,
      purpose: input.purpose
    };
    this.sessions.set(sessionId, result);
    return result;
  }

  async verifyWebhook(input: { sessionId: string; payload: unknown }): Promise<PaymentStatus> {
    const session = this.sessions.get(input.sessionId);
    if (!session) {
      return "FAILED";
    }
    const status = (input.payload as { status?: PaymentStatus })?.status ?? "PENDING";
    session.status = status;
    return status;
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    return this.sessions.get(sessionId)?.status ?? "FAILED";
  }

  async refundPayment(): Promise<PaymentStatus> {
    return "REFUNDED";
  }

  async createMandate(input: { userId: string }): Promise<{ mandateId: string; status: string }> {
    return { mandateId: `mandate_${input.userId}`, status: "mock_ready" };
  }

  async cancelMandate(input: { mandateId: string }): Promise<{ mandateId: string; status: string }> {
    return { mandateId: input.mandateId, status: "cancelled" };
  }

  async completeMockSession(sessionId: string, status: PaymentStatus): Promise<CheckoutSessionResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Payment session not found");
    }
    session.status = status;
    return session;
  }
}
