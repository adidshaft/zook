import { describe, expect, it } from "vitest";
import { MockWhatsAppProvider, normalizeWhatsAppPhone } from "../providers";

describe("WhatsApp provider", () => {
  it("normalizes Indian local numbers into E.164 format", () => {
    expect(normalizeWhatsAppPhone("9876543210")).toBe("+919876543210");
    expect(normalizeWhatsAppPhone("+91 98765 43210")).toBe("+919876543210");
  });

  it("rejects invalid phone numbers", async () => {
    const provider = new MockWhatsAppProvider();
    await expect(provider.validatePhone({ phone: "not-a-phone" })).resolves.toMatchObject({
      valid: false,
    });
  });

  it("records mock WhatsApp deliveries", async () => {
    const provider = new MockWhatsAppProvider();
    const result = await provider.sendWhatsApp({
      phone: "9876543210",
      templateName: "payment_receipt",
      body: "Your payment receipt is ready.",
    });

    expect(result.status).toBe("sent");
    expect(provider.deliveries).toHaveLength(1);
  });
});
