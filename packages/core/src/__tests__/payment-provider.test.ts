import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RazorpayPaymentProvider } from "../providers";

describe("razorpay payment provider", () => {
  const provider = new RazorpayPaymentProvider({
    keyId: "rzp_test_123",
    keySecret: "secret",
    webhookSecret: "webhook_secret",
    mode: "test"
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a valid webhook signature", async () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      created_at: 1710000000,
      payload: {
        payment: {
          entity: {
            id: "pay_123",
            order_id: "order_123",
            amount: 49900,
            currency: "INR"
          }
        }
      }
    });
    const signature = createHmac("sha256", "webhook_secret").update(rawBody).digest("hex");

    const verification = await provider.verifyWebhook({
      rawBody,
      signature
    });

    expect(verification.valid).toBe(true);
  });

  it("rejects an invalid webhook signature", async () => {
    const verification = await provider.verifyWebhook({
      rawBody: JSON.stringify({ event: "payment.failed" }),
      signature: "invalid"
    });

    expect(verification.valid).toBe(false);
    expect(verification.reason).toMatch(/Signature mismatch/);
  });

  it("maps captured and refund events to internal statuses", async () => {
    const captured = await provider.parseWebhookEvent({
      rawBody: JSON.stringify({
        event: "payment.captured",
        created_at: 1710000000,
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_123",
              amount: 49900,
              currency: "INR"
            }
          }
        }
      })
    });

    const refunded = await provider.parseWebhookEvent({
      rawBody: JSON.stringify({
        event: "refund.processed",
        created_at: 1710000001,
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_123",
              amount: 49900,
              currency: "INR"
            }
          },
          refund: {
            entity: {
              id: "rfnd_123",
              payment_id: "pay_123",
              amount: 49900,
              currency: "INR"
            }
          }
        }
      })
    });

    expect(captured?.paymentStatus).toBe("SUCCEEDED");
    expect(captured?.providerOrderId).toBe("order_123");
    expect(refunded?.paymentStatus).toBe("REFUNDED");
    expect(captured?.providerEventId).toBe("payment.captured:pay_123:1710000000");
    expect(refunded?.providerEventId).toBe("refund.processed:pay_123:1710000001");
  });

  it("creates a Razorpay plan and subscription for autopay mandates", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      });
      if (String(url).endsWith("/plans")) {
        return new Response(JSON.stringify({ id: "plan_123", period: "monthly", interval: 1 }), {
          status: 200
        });
      }
      return new Response(
        JSON.stringify({
          id: "sub_123",
          plan_id: "plan_123",
          status: "created",
          short_url: "https://rzp.io/i/sub_123",
          charge_at: 1773461489,
          total_count: 120,
          paid_count: 0
        }),
        { status: 200 }
      );
    });

    const result = await provider.createMandate({
      orgId: "org_123",
      userId: "user_123",
      referenceId: "session_123",
      amountPaise: 99900,
      planName: "Monthly Gym",
      billingPeriod: "monthly",
      billingInterval: 1,
      metadata: { autopayMandateId: "mandate_123" }
    });

    expect(result).toMatchObject({
      mandateId: "sub_123",
      providerPlanId: "plan_123",
      status: "created",
      checkoutUrl: "https://rzp.io/i/sub_123",
      checkoutData: {
        provider: "razorpay",
        subscriptionId: "sub_123",
        keyId: "rzp_test_123",
        recurring: true
      }
    });
    expect(calls[0]?.body).toMatchObject({
      period: "monthly",
      interval: 1,
      item: { name: "Monthly Gym", amount: 99900, currency: "INR" }
    });
    expect(calls[1]?.body).toMatchObject({
      plan_id: "plan_123",
      total_count: 120,
      customer_notify: true
    });
  });

  it("parses subscription charge events with provider subscription ids", async () => {
    const charged = await provider.parseWebhookEvent({
      rawBody: JSON.stringify({
        event: "subscription.charged",
        created_at: 1710000002,
        payload: {
          subscription: {
            entity: {
              id: "sub_123",
              status: "active",
              notes: { autopayMandateId: "mandate_123" }
            }
          },
          payment: {
            entity: {
              id: "pay_456",
              subscription_id: "sub_123",
              amount: 99900,
              currency: "INR"
            }
          }
        }
      })
    });

    expect(charged).toMatchObject({
      eventType: "subscription.charged",
      paymentStatus: "SUCCEEDED",
      providerPaymentId: "pay_456",
      providerSubscriptionId: "sub_123",
      amountPaise: 99900,
      metadata: { autopayMandateId: "mandate_123" }
    });
  });
});
