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

export class Msg91SmsProvider implements SmsProvider {
  private readonly apiBaseUrl: string;
  private readonly otpExpiryMinutes: number;

  constructor(
    private readonly input: {
      authKey: string;
      templateId: string;
      senderId?: string;
      apiBaseUrl?: string;
      otpExpiryMinutes?: number;
    },
  ) {
    this.apiBaseUrl = input.apiBaseUrl ?? "https://control.msg91.com/api/v5/otp";
    this.otpExpiryMinutes = input.otpExpiryMinutes ?? 10;
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "msg91",
      mode: "live",
      configured: true,
      metadata: {
        templateId: this.input.templateId,
        hasSenderId: Boolean(this.input.senderId),
        otpExpiryMinutes: this.otpExpiryMinutes,
      },
    };
  }

  async sendOtp(input: { phone: string; code: string; expiresAt: Date }): Promise<void> {
    const url = new URL(this.apiBaseUrl);
    url.searchParams.set("template_id", this.input.templateId);
    url.searchParams.set("mobile", normalizeMsg91Mobile(input.phone));
    url.searchParams.set("authkey", this.input.authKey);
    url.searchParams.set("otp", input.code);
    url.searchParams.set("otp_expiry", String(this.otpExpiryMinutes));
    url.searchParams.set("realTimeResponse", "1");
    if (this.input.senderId) {
      url.searchParams.set("sender", this.input.senderId);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authkey: this.input.authKey,
      },
      body: JSON.stringify({ otp: input.code }),
    });
    if (!response.ok) {
      throw new Error(`MSG91 OTP failed with ${response.status}.`);
    }
  }
}

function normalizeMsg91Mobile(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}
