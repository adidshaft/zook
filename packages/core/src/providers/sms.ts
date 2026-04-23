export interface SmsProvider {
  sendOtp(input: { phone: string; code: string; expiresAt: Date }): Promise<void>;
}

export class MockSmsProvider implements SmsProvider {
  sent: Array<{ phone: string; code: string }> = [];

  async sendOtp(input: { phone: string; code: string }): Promise<void> {
    this.sent.push({ phone: input.phone, code: input.code });
  }
}
