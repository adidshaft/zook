import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface EmailProvider extends DiagnosticProvider {
  sendOtp(input: { email: string; code: string; expiresAt: Date }): Promise<void>;
  sendNotificationEmail(input: { email: string; title: string; body: string }): Promise<void>;
}

export class MockEmailProvider implements EmailProvider {
  sent: Array<{ kind: "otp" | "notification"; email: string; title?: string; body?: string; code?: string }> = [];

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

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string, private readonly fromEmail = "Zook <noreply@zook.app>") {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "resend",
      mode: "live",
      configured: Boolean(this.apiKey),
      metadata: {
        fromEmail: this.fromEmail
      }
    };
  }

  async sendOtp(input: { email: string; code: string; expiresAt: Date }): Promise<void> {
    await this.send({
      to: input.email,
      subject: "Your Zook sign-in code",
      html: `<p>Your Zook OTP is <strong>${input.code}</strong>. It expires at ${input.expiresAt.toISOString()}.</p>`
    });
  }

  async sendNotificationEmail(input: { email: string; title: string; body: string }): Promise<void> {
    await this.send({
      to: input.email,
      subject: input.title,
      html: `<p>${input.body}</p>`
    });
  }

  private async send(input: { to: string; subject: string; html: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html
      })
    });
    if (!response.ok) {
      throw new Error(`Resend request failed with status ${response.status}`);
    }
  }
}
