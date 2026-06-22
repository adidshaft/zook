import nodemailer, { type Transporter } from "nodemailer";
import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";
import { zookLogger } from "../logger";
import { formatEnumLabel } from "../utils/format";

export interface OtpEmailInput {
  to: string;
  code: string;
  expiresAt: Date;
  purpose?: string;
}

export interface NotificationEmailInput {
  to: string;
  title: string;
  body: string;
  organizationName?: string;
  actionLabel?: string;
  actionUrl?: string;
  variant?: "generic" | "membership_activation" | "trial_expiring";
}

export interface StaffInviteEmailInput {
  to: string;
  organizationName: string;
  role: string;
  inviterName?: string;
  inviteUrl?: string;
  expiresAt?: Date;
}

export interface GuardianConsentEmailInput {
  to: string;
  minorName: string;
  organizationName: string;
  guardianName?: string;
  code?: string;
  consentUrl?: string;
  expiresAt?: Date;
}

type EmailMessage = {
  subject: string;
  previewText: string;
  text: string;
  html: string;
  template: string;
};

type MockEmailEvent =
  | {
      kind: "otp";
      email: string;
      template: string;
      subject: string;
      code: string;
    }
  | {
      kind: "notification" | "staff_invite" | "guardian_consent";
      email: string;
      template: string;
      subject: string;
      previewText: string;
    };

export interface EmailProvider extends DiagnosticProvider {
  sendOtpEmail(input: OtpEmailInput): Promise<void>;
  sendNotificationEmail(input: NotificationEmailInput): Promise<void>;
  sendStaffInviteEmail(input: StaffInviteEmailInput): Promise<void>;
  sendGuardianConsentEmail(input: GuardianConsentEmailInput): Promise<void>;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function renderEmailShell(input: {
  eyebrow: string;
  title: string;
  intro: string;
  summaryLines: string[];
  code?: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote: string;
}) {
  const summaryHtml = input.summaryLines
    .map(
      (line) =>
        `<p style="margin:0 0 10px;color:#c7d1dd;font-size:14px;line-height:1.6;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const actionHtml =
    input.actionLabel && input.actionUrl
      ? `<a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;margin-top:20px;padding:12px 18px;border-radius:999px;background:#b9f455;color:#07110b;text-decoration:none;font-weight:700;">${escapeHtml(input.actionLabel)}</a>`
      : "";

  const codeHtml = input.code
    ? `<div style="margin:24px 0;padding:18px 20px;border:1px solid rgba(255,255,255,0.12);border-radius:22px;background:rgba(7,17,11,0.55);text-align:center;">
         <div style="color:#7db0ff;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">One-time code</div>
         <div style="margin-top:10px;color:#f5f8fc;font-size:34px;font-weight:800;letter-spacing:0.24em;">${escapeHtml(input.code)}</div>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#050809;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#f5f8fc;">
    <div style="padding:28px 12px;background:radial-gradient(circle at top,#123127 0%,#050809 52%);">
      <div style="max-width:620px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:30px;overflow:hidden;background:rgba(10,14,17,0.92);box-shadow:0 18px 60px rgba(0,0,0,0.45);">
        <div style="padding:28px 30px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,rgba(22,37,32,0.95),rgba(9,12,15,0.92));">
          <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(255,255,255,0.08);border-radius:999px;background:rgba(255,255,255,0.04);color:#b9f455;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Zook</div>
          <div style="margin-top:22px;color:#8aa4c2;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</div>
          <h1 style="margin:12px 0 0;color:#f5f8fc;font-size:30px;line-height:1.15;font-weight:800;">${escapeHtml(input.title)}</h1>
          <p style="margin:12px 0 0;color:#c7d1dd;font-size:15px;line-height:1.7;">${escapeHtml(input.intro)}</p>
        </div>
        <div style="padding:28px 30px 30px;">
          ${codeHtml}
          ${summaryHtml}
          ${actionHtml}
          <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);color:#7d8794;font-size:12px;line-height:1.6;">
            ${escapeHtml(input.footerNote)}
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildOtpEmail(input: OtpEmailInput): EmailMessage {
  const expiryLabel = formatDateTime(input.expiresAt);
  return {
    subject: "Your Zook sign-in code",
    previewText: `Use ${input.code} to finish signing in to Zook.`,
    template: "otp",
    text: `Your Zook OTP is ${input.code}. It expires at ${expiryLabel}. If you did not request this, ignore this email.`,
    html: renderEmailShell({
      eyebrow: "Secure sign-in",
      title: "Use this code to continue",
      intro: "Zook only uses this OTP to finish your sign-in. Never share this code with anyone.",
      summaryLines: [
        `Purpose: ${input.purpose ?? "login"}`,
        `Expires: ${expiryLabel}`,
        "If you did not request this sign-in, you can safely ignore this email.",
      ],
      code: input.code,
      footerNote:
        "Security note: Zook staff will never ask you for this OTP by call, chat, or WhatsApp.",
    }),
  };
}

function buildNotificationEmail(input: NotificationEmailInput): EmailMessage {
  const eyebrow =
    input.variant === "membership_activation"
      ? "Membership activated"
      : input.variant === "trial_expiring"
        ? "Trial reminder"
        : "Zook update";
  const intro =
    input.variant === "membership_activation"
      ? "Your gym membership is active and ready to use."
      : input.variant === "trial_expiring"
        ? "Your Zook trial window is coming up soon."
        : input.body;

  return {
    subject: input.title,
    previewText: input.body,
    template: input.variant ?? "generic_notification",
    text: `${input.title}\n\n${input.body}`,
    html: renderEmailShell({
      eyebrow,
      title: input.title,
      intro,
      summaryLines: [
        input.body,
        ...(input.organizationName ? [`Organization: ${input.organizationName}`] : []),
      ],
      ...(input.actionLabel && input.actionUrl
        ? { actionLabel: input.actionLabel, actionUrl: input.actionUrl }
        : {}),
      footerNote:
        "If this update looks unusual, sign in to Zook directly instead of following any forwarded links.",
    }),
  };
}

function buildStaffInviteEmail(input: StaffInviteEmailInput): EmailMessage {
  const roleLabel = formatEnumLabel(input.role, { casing: "lower" });
  return {
    subject: `You're invited to join ${input.organizationName} on Zook`,
    previewText: `${input.organizationName} invited you as ${roleLabel}.`,
    template: "staff_invite",
    text: `${input.organizationName} invited you to join Zook as ${roleLabel}.${input.inviteUrl ? ` Open ${input.inviteUrl} to continue.` : ""}`,
    html: renderEmailShell({
      eyebrow: "Staff invitation",
      title: `Join ${input.organizationName}`,
      intro: `${input.inviterName ?? "Your gym team"} invited you to Zook as ${roleLabel}.`,
      summaryLines: [
        `Role: ${roleLabel}`,
        ...(input.expiresAt ? [`Invite expires: ${formatDateTime(input.expiresAt)}`] : []),
        "Accept the invitation from a trusted link and finish sign-in with your OTP.",
      ],
      ...(input.inviteUrl ? { actionLabel: "Accept invite", actionUrl: input.inviteUrl } : {}),
      footerNote:
        "Only continue if you were expecting this invitation from your gym owner or admin.",
    }),
  };
}

function buildGuardianConsentEmail(input: GuardianConsentEmailInput): EmailMessage {
  const codeLine = input.code ? [`Guardian OTP: ${input.code}`] : [];
  return {
    subject: `Legacy member approval notice for ${input.minorName}`,
    previewText: `This legacy approval email is no longer required in Zook.`,
    template: "guardian_consent",
    text: `This legacy approval flow is deprecated for ${input.minorName}.${input.code ? ` Your old OTP was ${input.code}.` : ""}${input.consentUrl ? ` Open ${input.consentUrl} to return to Zook.` : ""}`,
    html: renderEmailShell({
      eyebrow: "Legacy approval",
      title: `No approval needed for ${input.minorName}`,
      intro: `${input.organizationName} no longer requires this legacy approval before Zook member features can be used.`,
      summaryLines: [
        ...(input.guardianName ? [`Guardian: ${input.guardianName}`] : []),
        ...codeLine,
        ...(input.expiresAt ? [`Expires: ${formatDateTime(input.expiresAt)}`] : []),
        "Membership activation, attendance, and personalized features are no longer blocked by this legacy flow.",
      ],
      ...(input.consentUrl ? { actionLabel: "Return to Zook", actionUrl: input.consentUrl } : {}),
      ...(input.code ? { code: input.code } : {}),
      footerNote:
        "If you were not expecting this request, contact the gym directly before sharing any OTP.",
    }),
  };
}

export class MockEmailProvider implements EmailProvider {
  sent: MockEmailEvent[] = [];

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

  async sendOtpEmail(input: OtpEmailInput): Promise<void> {
    const message = buildOtpEmail(input);
    this.sent.push({
      kind: "otp",
      email: input.to,
      template: message.template,
      subject: message.subject,
      code: input.code,
    });
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_EMAIL_OTP_LOGS === "true") {
      zookLogger.info("zook.mock_email.otp_sent", {
        to: input.to,
        purpose: input.purpose ?? "login",
        code: input.code,
      });
    }
  }

  async sendNotificationEmail(input: NotificationEmailInput): Promise<void> {
    const message = buildNotificationEmail(input);
    this.sent.push({
      kind: "notification",
      email: input.to,
      template: message.template,
      subject: message.subject,
      previewText: message.previewText,
    });
  }

  async sendStaffInviteEmail(input: StaffInviteEmailInput): Promise<void> {
    const message = buildStaffInviteEmail(input);
    this.sent.push({
      kind: "staff_invite",
      email: input.to,
      template: message.template,
      subject: message.subject,
      previewText: message.previewText,
    });
  }

  async sendGuardianConsentEmail(input: GuardianConsentEmailInput): Promise<void> {
    const message = buildGuardianConsentEmail(input);
    this.sent.push({
      kind: "guardian_consent",
      email: input.to,
      template: message.template,
      subject: message.subject,
      previewText: message.previewText,
    });
  }
}

abstract class BaseTransactionalEmailProvider implements EmailProvider {
  constructor(protected readonly fromEmail: string) {}

  abstract getDiagnostics(): ProviderInstanceDiagnostics;
  protected abstract deliver(input: { to: string; message: EmailMessage }): Promise<void>;

  async sendOtpEmail(input: OtpEmailInput): Promise<void> {
    await this.deliver({ to: input.to, message: buildOtpEmail(input) });
  }

  async sendNotificationEmail(input: NotificationEmailInput): Promise<void> {
    await this.deliver({ to: input.to, message: buildNotificationEmail(input) });
  }

  async sendStaffInviteEmail(input: StaffInviteEmailInput): Promise<void> {
    await this.deliver({ to: input.to, message: buildStaffInviteEmail(input) });
  }

  async sendGuardianConsentEmail(input: GuardianConsentEmailInput): Promise<void> {
    await this.deliver({ to: input.to, message: buildGuardianConsentEmail(input) });
  }
}

export class SMTPEmailProvider extends BaseTransactionalEmailProvider {
  private readonly transporter: Transporter;

  constructor(input: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromEmail: string;
  }) {
    super(input.fromEmail);
    this.transporter = nodemailer.createTransport({
      host: input.host,
      port: input.port,
      secure: input.port === 465,
      auth: {
        user: input.user,
        pass: input.pass,
      },
    });
    this.host = input.host;
    this.port = input.port;
  }

  private readonly host: string;
  private readonly port: number;

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "smtp",
      mode: "live",
      configured: true,
      metadata: {
        host: this.host,
        port: this.port,
        fromEmail: this.fromEmail,
      },
    };
  }

  protected async deliver(input: { to: string; message: EmailMessage }): Promise<void> {
    await this.transporter.sendMail({
      from: this.fromEmail,
      to: input.to,
      subject: input.message.subject,
      text: input.message.text,
      html: input.message.html,
    });
  }
}

export class ResendEmailProvider extends BaseTransactionalEmailProvider {
  constructor(
    private readonly apiKey: string,
    fromEmail = "Zook <noreply@zookfit.in>",
  ) {
    super(fromEmail);
  }

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "resend",
      mode: "live",
      configured: Boolean(this.apiKey),
      metadata: {
        fromEmail: this.fromEmail,
      },
    };
  }

  protected async deliver(input: { to: string; message: EmailMessage }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: input.to,
        subject: input.message.subject,
        text: input.message.text,
        html: input.message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend request failed with status ${response.status}`);
    }
  }
}
