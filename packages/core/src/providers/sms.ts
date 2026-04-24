import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface SmsProvider extends DiagnosticProvider {
  sendOtp(input: { phone: string; code: string; expiresAt: Date }): Promise<void>;
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
        sentCount: this.sent.length
      }
    };
  }

  async sendOtp(input: { phone: string; code: string }): Promise<void> {
    this.sent.push({ phone: input.phone, code: input.code });
  }
}
