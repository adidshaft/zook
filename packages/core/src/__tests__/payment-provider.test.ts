import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RazorpayPaymentProvider } from "../providers";

describe("razorpay payment provider", () => {
  const provider = new RazorpayPaymentProvider({
    keyId: "rzp_test_123",
    keySecret: "secret",
    webhookSecret: "webhook_secret",
    mode: "test"
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
});
