import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface SmsProvider extends DiagnosticProvider {
  sendOtp(input: { phone: string; code: string; expiresAt: Date }): Promise<void>;
}

export class DisabledSmsProvider implements SmsProvider {
  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "disabled",
      mode: "disabled",
      configured: false,
      metadata: {
        delivery: "disabled",
      },
    };
  }

  async sendOtp(): Promise<void> {
    throw new Error("SMS provider is disabled.");
  }
}

export class MockSmsProvider implements SmsProvider {
  sent: Array<{ phone: string; code: string }> = [];

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        delivery: "in-memory",
        sentCount: this.sent.length,
      },
    };
  }

  async sendOtp(input: { phone: string; code: string }): Promise<void> {
    this.sent.push({ phone: input.phone, code: input.code });
  }
}

export class WebhookSmsProvider implements SmsProvider {
  constructor(private readonly input: { url: string; bearerToken?: string }) {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "webhook",
      mode: "live",
      configured: true,
      metadata: {
        urlHost: new URL(this.input.url).host,
        hasBearerToken: Boolean(this.input.bearerToken),
      },
    };
  }

  async sendOtp(input: { phone: string; code: string; expiresAt: Date }): Promise<void> {
    const response = await fetch(this.input.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.input.bearerToken ? { authorization: `Bearer ${this.input.bearerToken}` } : {}),
      },
      body: JSON.stringify({
        type: "otp",
        phone: input.phone,
        code: input.code,
        expiresAt: input.expiresAt.toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error(`SMS webhook failed with ${response.status}.`);
    }
  }
}
