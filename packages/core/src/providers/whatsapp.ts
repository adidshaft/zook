import type { DiagnosticProvider, ProviderInstanceDiagnostics } from "../types";

export interface RegisterWhatsAppDeviceInput {
  userId: string;
  phone: string;
  organizationId?: string;
  deviceId?: string;
  deviceName?: string;
  locale?: string;
  timezone?: string;
}

export interface WhatsAppSendInput {
  phone: string;
  templateName: string;
  body: string;
  variables?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  deliveryId: string;
  status: "queued" | "sent" | "failed" | "invalid_phone";
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface WhatsAppProvider extends DiagnosticProvider {
  readonly providerName: string;
  registerDevice(
    input: RegisterWhatsAppDeviceInput,
  ): Promise<{ status: "registered" | "invalid_phone"; normalizedPhone?: string }>;
  unregisterDevice(input: { phone: string }): Promise<{ status: "unregistered" }>;
  sendWhatsApp(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
  sendBatch(input: WhatsAppSendInput[]): Promise<WhatsAppSendResult[]>;
  validatePhone(input: { phone: string }): Promise<{ valid: boolean; normalizedPhone?: string; reason?: string }>;
}

export function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.trim().replace(/\D/g, "");
  const normalized =
    phone.trim().startsWith("+")
      ? `+${digits}`
      : digits.length === 10
        ? `+91${digits}`
        : digits.length === 12 && digits.startsWith("91")
          ? `+${digits}`
          : digits.length >= 8 && digits.length <= 15
            ? `+${digits}`
            : "";
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly providerName = "mock";
  deliveries: WhatsAppSendResult[] = [];

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "mock",
      mode: "mock",
      configured: true,
      metadata: {
        deliveryMode: "in-memory",
        deliveryCount: this.deliveries.length,
      },
    };
  }

  async validatePhone(input: { phone: string }) {
    const normalizedPhone = normalizeWhatsAppPhone(input.phone);
    return normalizedPhone
      ? { valid: true, normalizedPhone }
      : { valid: false, reason: "Phone number is not valid for WhatsApp delivery." };
  }

  async registerDevice(input: RegisterWhatsAppDeviceInput) {
    const validation = await this.validatePhone({ phone: input.phone });
    if (!validation.valid || !validation.normalizedPhone) {
      return { status: "invalid_phone" as const };
    }
    return { status: "registered" as const, normalizedPhone: validation.normalizedPhone };
  }

  async unregisterDevice(): Promise<{ status: "unregistered" }> {
    return { status: "unregistered" };
  }

  async sendWhatsApp(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const validation = await this.validatePhone({ phone: input.phone });
    const deliveryId = `whatsapp_${this.deliveries.length + 1}`;
    const result: WhatsAppSendResult = validation.valid
      ? { deliveryId, status: "sent" }
      : {
          deliveryId,
          status: "invalid_phone",
          errorMessage: validation.reason ?? "Phone number is not valid for WhatsApp delivery.",
        };
    this.deliveries.push(result);
    return result;
  }

  async sendBatch(input: WhatsAppSendInput[]) {
    return Promise.all(input.map((entry) => this.sendWhatsApp(entry)));
  }
}

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly providerName = "twilio";

  constructor(
    private readonly config: {
      accountSid: string;
      authToken: string;
      fromPhone: string;
    },
  ) {}

  getDiagnostics(): ProviderInstanceDiagnostics {
    return {
      provider: "twilio",
      mode: "live",
      configured: true,
      metadata: {
        fromConfigured: Boolean(this.config.fromPhone),
      },
    };
  }

  async validatePhone(input: { phone: string }) {
    const normalizedPhone = normalizeWhatsAppPhone(input.phone);
    return normalizedPhone
      ? { valid: true, normalizedPhone }
      : { valid: false, reason: "Phone number is not valid for WhatsApp delivery." };
  }

  async registerDevice(input: RegisterWhatsAppDeviceInput) {
    const validation = await this.validatePhone({ phone: input.phone });
    if (!validation.valid || !validation.normalizedPhone) {
      return { status: "invalid_phone" as const };
    }
    return { status: "registered" as const, normalizedPhone: validation.normalizedPhone };
  }

  async unregisterDevice(): Promise<{ status: "unregistered" }> {
    return { status: "unregistered" };
  }

  async sendWhatsApp(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const validation = await this.validatePhone({ phone: input.phone });
    if (!validation.valid || !validation.normalizedPhone) {
      return {
        deliveryId: "twilio_invalid_phone",
        status: "invalid_phone",
        errorMessage: validation.reason ?? "Phone number is not valid for WhatsApp delivery.",
      };
    }

    const params = new URLSearchParams({
      From: `whatsapp:${this.config.fromPhone}`,
      To: `whatsapp:${validation.normalizedPhone}`,
      Body: input.body,
    });
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!response.ok) {
      return {
        deliveryId: `twilio_failed_${Date.now()}`,
        status: "failed",
        errorCode: String(response.status),
        errorMessage: "Twilio WhatsApp request failed.",
      };
    }

    const payload = (await response.json()) as { sid?: string; status?: string };
    return {
      deliveryId: payload.sid ?? `twilio_${Date.now()}`,
      status: payload.status === "queued" ? "queued" : "sent",
      ...(payload.sid ? { providerMessageId: payload.sid } : {}),
    };
  }

  async sendBatch(input: WhatsAppSendInput[]) {
    return Promise.all(input.map((entry) => this.sendWhatsApp(entry)));
  }
}
