export interface EmailProvider {
  sendOtp(input: { email: string; code: string; expiresAt: Date }): Promise<void>;
  sendNotificationEmail(input: { email: string; title: string; body: string }): Promise<void>;
}

export class MockEmailProvider implements EmailProvider {
  sent: Array<{ kind: "otp" | "notification"; email: string; title?: string; body?: string; code?: string }> = [];

  async sendOtp(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    this.sent.push({ kind: "otp", email: input.email, code: input.code });
    if (process.env.NODE_ENV === "development") {
      console.info(`[Zook mock email] OTP for ${input.email}: ${input.code}`);
    }
  }

  async sendNotificationEmail(input: { email: string; title: string; body: string }): Promise<void> {
    this.sent.push({ kind: "notification", email: input.email, title: input.title, body: input.body });
  }
}
