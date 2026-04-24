import { createHmac, randomUUID } from "node:crypto";
import type { DiagnosticProvider, PaymentPurpose, PaymentStatus, ProviderInstanceDiagnostics } from "../types";

export interface CheckoutSessionInput {
  orgId?: string;
  userId?: string;
  purpose: PaymentPurpose;
  amountPaise: number;
  currency?: "INR";
  referenceId?: string;
  returnUrl?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  providerSessionId?: string;
  providerOrderId?: string;
  checkoutUrl?: string;
  checkoutData?: Record<string, unknown>;
  status: PaymentStatus;
  amountPaise: number;
  purpose: PaymentPurpose;
}

export interface CheckoutSessionSnapshot {
  providerSessionId: string;
  providerOrderId?: string;
  status: PaymentStatus;
  amountPaise?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentWebhookVerificationInput {
  rawBody: string | Buffer;
  signature?: string;
  headers?: Record<string, string | undefined>;
}

export interface PaymentWebhookVerificationResult {
  valid: boolean;
  providerEventId?: string;
  reason?: string;
}

export interface ParsedPaymentWebhookEvent {
  provider: string;
  providerEventId: string;
  eventType: string;
  eventVersion?: string;
  paymentStatus: PaymentStatus;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountPaise?: number;
  currency?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  rawPayload: unknown;
}

export interface RefundPaymentResult {
  status: PaymentStatus;
  providerRefundId?: string;
}

export interface PaymentProvider extends DiagnosticProvider {
  readonly providerName: string;
  readonly mode: "mock" | "test" | "live";
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  getCheckoutSession(providerSessionId: string): Promise<CheckoutSessionSnapshot | null>;
  verifyWebhook(input: PaymentWebhookVerificationInput): Promise<PaymentWebhookVerificationResult>;
  parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent | null>;
  getPaymentStatus(input: { providerPaymentId?: string; providerOrderId?: string; paymentSessionId?: string }): Promise<PaymentStatus>;
  refundPayment(input: { paymentId: string; amountPaise?: number; reason?: string }): Promise<RefundPaymentResult>;
  createMandate(input: { userId: string; amountPaise: number; metadata?: Record<string, unknown> }): Promise<{ mandateId: string; status: string }>;
  cancelMandate(input: { mandateId: string; reason?: string }): Promise<{ mandateId: string; status: string }>;
}

export class MockPaymentProvider implements PaymentProvider {
  readonly providerName = "mock";
  readonly mode = "mock" as const;
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
    const sessionId = input.referenceId ?? `mock_${Math.random().toString(36).slice(2, 12)}`;
    const result: CheckoutSessionResult = {
      sessionId,
      providerSessionId: sessionId,
      providerOrderId: sessionId,
      checkoutUrl: `/checkout/mock/${sessionId}`,
      checkoutData: {
        mode: "mock-hosted",
        sessionId
      },
      status: "CREATED",
      amountPaise: input.amountPaise,
      purpose: input.purpose
    };
    this.sessions.set(sessionId, result);
    return result;
  }

  async getCheckoutSession(providerSessionId: string): Promise<CheckoutSessionSnapshot | null> {
    const session = this.sessions.get(providerSessionId);
    if (!session) {
      return null;
    }
    return {
      providerSessionId,
      status: session.status,
      amountPaise: session.amountPaise,
      currency: "INR",
      ...(session.providerOrderId ? { providerOrderId: session.providerOrderId } : {})
    };
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<PaymentWebhookVerificationResult> {
    const payload = typeof input.rawBody === "string" ? JSON.parse(input.rawBody) : JSON.parse(input.rawBody.toString("utf8"));
    const providerEventId = `mock:${payload.sessionId ?? payload.id ?? "unknown"}:${payload.status ?? "PENDING"}`;
    return { valid: true, providerEventId };
  }

  async parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent | null> {
    const payload =
      typeof input.rawBody === "string" ? JSON.parse(input.rawBody) : JSON.parse(input.rawBody.toString("utf8"));
    const paymentStatus = (payload.status as PaymentStatus | undefined) ?? "PENDING";
    return {
      provider: this.providerName,
      providerEventId: `mock:${payload.sessionId ?? payload.id ?? "unknown"}:${paymentStatus}`,
      eventType: `payment.${String(paymentStatus).toLowerCase()}`,
      paymentStatus,
      providerOrderId: payload.sessionId,
      idempotencyKey: `mock:${payload.sessionId ?? payload.id ?? "unknown"}:${paymentStatus}`,
      rawPayload: payload
    };
  }

  async getPaymentStatus(input: { providerPaymentId?: string; providerOrderId?: string; paymentSessionId?: string }): Promise<PaymentStatus> {
    const sessionId = input.providerOrderId ?? input.paymentSessionId ?? input.providerPaymentId;
    return sessionId ? this.sessions.get(sessionId)?.status ?? "FAILED" : "FAILED";
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    return { status: "REFUNDED", providerRefundId: `refund_${randomUUID()}` };
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

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
};

type RazorpayPaymentResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
};

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly providerName = "razorpay";
  readonly mode: "test" | "live";

  constructor(
    private readonly config: {
      keyId: string;
      keySecret: string;
      webhookSecret: string;
      mode: "test" | "live";
      themeColor?: string;
    }
  ) {
    this.mode = config.mode;
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "razorpay",
      mode: this.mode,
      configured: true,
      metadata: {
        paymentFlow: "server-created-order",
        checkoutThemeColor: this.config.themeColor ?? null
      }
    };
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const authToken = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString("base64");
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });

    if (!response.ok) {
      throw new Error(`Razorpay request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const order = await this.request<RazorpayOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency ?? "INR",
        receipt: input.referenceId ?? `zook_${randomUUID().slice(0, 18)}`,
        notes: Object.fromEntries(
          Object.entries(input.metadata ?? {}).map(([key, value]) => [key, String(value)])
        )
      })
    });

    return {
      sessionId: order.id,
      providerSessionId: order.id,
      providerOrderId: order.id,
      status: "CREATED",
      amountPaise: input.amountPaise,
      purpose: input.purpose,
      checkoutData: {
        provider: "razorpay",
        orderId: order.id,
        keyId: this.config.keyId,
        amountPaise: input.amountPaise,
        currency: input.currency ?? "INR",
        themeColor: this.config.themeColor ?? null,
        mode: this.mode,
        returnUrl: input.returnUrl ?? null
      }
    };
  }

  async getCheckoutSession(providerSessionId: string): Promise<CheckoutSessionSnapshot | null> {
    const order = await this.request<RazorpayOrderResponse>(`/orders/${providerSessionId}`);
    return {
      providerSessionId: order.id,
      providerOrderId: order.id,
      status:
        order.status === "paid"
          ? "SUCCEEDED"
          : order.status === "attempted"
            ? "PENDING"
            : order.status === "created"
              ? "CREATED"
              : "FAILED",
      amountPaise: order.amount,
      currency: order.currency
    };
  }

  async verifyWebhook(input: PaymentWebhookVerificationInput): Promise<PaymentWebhookVerificationResult> {
    const rawBody = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const signature = input.signature ?? input.headers?.["x-razorpay-signature"];
    if (!signature) {
      return { valid: false, reason: "Missing x-razorpay-signature header." };
    }
    const expected = createHmac("sha256", this.config.webhookSecret).update(rawBody).digest("hex");
    if (expected !== signature) {
      return { valid: false, reason: "Signature mismatch." };
    }

    const event = JSON.parse(rawBody) as { event?: string; created_at?: number };
    return {
      valid: true,
      providerEventId: `${event.event ?? "unknown"}:${event.created_at ?? "unknown"}`
    };
  }

  async parseWebhookEvent(input: PaymentWebhookVerificationInput): Promise<ParsedPaymentWebhookEvent | null> {
    const rawBody = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
    const payload = JSON.parse(rawBody) as {
      event?: string;
      created_at?: number;
      contains?: string[];
      payload?: {
        payment?: { entity?: Record<string, unknown> };
        order?: { entity?: Record<string, unknown> };
        refund?: { entity?: Record<string, unknown> };
      };
    };

    const eventType = payload.event ?? "unknown";
    const paymentEntity = payload.payload?.payment?.entity ?? {};
    const orderEntity = payload.payload?.order?.entity ?? {};
    const refundEntity = payload.payload?.refund?.entity ?? {};
    const providerPaymentId = String(paymentEntity.id ?? refundEntity.payment_id ?? "");
    const providerOrderId = String(paymentEntity.order_id ?? orderEntity.id ?? "");
    const metadata =
      (paymentEntity.notes as Record<string, unknown> | undefined) ??
      (orderEntity.notes as Record<string, unknown> | undefined) ??
      undefined;
    const providerEventId = `${eventType}:${providerPaymentId || String(refundEntity.id ?? "") || providerOrderId || "unknown"}:${payload.created_at ?? "unknown"}`;

    let paymentStatus: PaymentStatus = "PENDING";
    if (eventType === "payment.captured" || eventType === "order.paid") {
      paymentStatus = "SUCCEEDED";
    } else if (eventType === "payment.failed") {
      paymentStatus = "FAILED";
    } else if (eventType === "payment.authorized") {
      paymentStatus = "REQUIRES_ACTION";
    } else if (eventType === "refund.created" || eventType === "refund.processed") {
      const refundAmount = Number(refundEntity.amount ?? 0);
      const paymentAmount = Number(paymentEntity.amount ?? refundAmount);
      paymentStatus = refundAmount > 0 && refundAmount < paymentAmount ? "PARTIALLY_REFUNDED" : "REFUNDED";
    } else if (eventType.includes("dispute")) {
      paymentStatus = "DISPUTED";
    }

    return {
      provider: this.providerName,
      providerEventId,
      eventType,
      paymentStatus,
      ...(payload.contains?.length ? { eventVersion: payload.contains.join(",") } : {}),
      ...(providerPaymentId ? { providerPaymentId } : {}),
      ...(providerOrderId ? { providerOrderId } : {}),
      ...((Number(paymentEntity.amount ?? orderEntity.amount ?? refundEntity.amount ?? 0) || undefined)
        ? { amountPaise: Number(paymentEntity.amount ?? orderEntity.amount ?? refundEntity.amount ?? 0) }
        : {}),
      ...(String(paymentEntity.currency ?? orderEntity.currency ?? refundEntity.currency ?? "")
        ? { currency: String(paymentEntity.currency ?? orderEntity.currency ?? refundEntity.currency ?? "") }
        : {}),
      idempotencyKey: `${eventType}:${providerEventId}`,
      ...(metadata ? { metadata } : {}),
      rawPayload: payload
    };
  }

  async getPaymentStatus(input: { providerPaymentId?: string; providerOrderId?: string; paymentSessionId?: string }): Promise<PaymentStatus> {
    if (input.providerPaymentId) {
      const payment = await this.request<RazorpayPaymentResponse>(`/payments/${input.providerPaymentId}`);
      if (payment.status === "captured") {
        return "SUCCEEDED";
      }
      if (payment.status === "failed") {
        return "FAILED";
      }
      if (payment.status === "authorized") {
        return "REQUIRES_ACTION";
      }
      return "PENDING";
    }

    const orderId = input.providerOrderId ?? input.paymentSessionId;
    if (!orderId) {
      return "FAILED";
    }

    const order = await this.getCheckoutSession(orderId);
    return order?.status ?? "FAILED";
  }

  async refundPayment(input: { paymentId: string; amountPaise?: number; reason?: string }): Promise<RefundPaymentResult> {
    const refund = await this.request<{ id: string }>("/payments/" + input.paymentId + "/refund", {
      method: "POST",
      body: JSON.stringify({
        ...(input.amountPaise ? { amount: input.amountPaise } : {}),
        ...(input.reason ? { notes: { reason: input.reason } } : {})
      })
    });
    return {
      status: "REFUNDED",
      providerRefundId: refund.id
    };
  }

  async createMandate(input: { userId: string }): Promise<{ mandateId: string; status: string }> {
    return { mandateId: `razorpay_mandate_${input.userId}`, status: "not_implemented" };
  }

  async cancelMandate(input: { mandateId: string }): Promise<{ mandateId: string; status: string }> {
    return { mandateId: input.mandateId, status: "not_implemented" };
  }
}
